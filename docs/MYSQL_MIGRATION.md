# MySQL Migration Guide for LIBERTY Server

## Overview

This guide explains how to migrate from SQLite to MySQL for production deployments. The project now supports both backends with automatic detection based on the `DATABASE_URL` environment variable.

## Quick Start (New MySQL Installation)

### 1. Install MySQL 8.0+

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install mysql-server mysql-client
sudo systemctl enable mysql
sudo systemctl start mysql
```

**CentOS/RHEL:**
```bash
sudo yum install mysql-server mysql
sudo systemctl enable mysqld
sudo systemctl start mysqld
```

**macOS:**
```bash
brew install mysql
brew services start mysql
```

**Windows:**
Download and install from https://dev.mysql.com/downloads/installer/

### 2. Create Database and User

```bash
sudo mysql -u root
```

```sql
-- Create database with UTF-8 support
CREATE DATABASE liberty_db 
  CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

-- Create user (change 'your_password' to a secure password)
CREATE USER 'liberty'@'localhost' 
  IDENTIFIED BY 'your_secure_password';

-- Grant privileges
GRANT ALL PRIVILEGES ON liberty_db.* 
  TO 'liberty'@'localhost';

-- For remote connections (optional, less secure)
-- CREATE USER 'liberty'@'%' IDENTIFIED BY 'your_secure_password';
-- GRANT ALL PRIVILEGES ON liberty_db.* TO 'liberty'@'%';

FLUSH PRIVILEGES;
EXIT;
```

### 3. Configure Environment

Copy the MySQL configuration template:
```bash
cp .env.mysql .env
```

Edit `.env` with your database credentials:
```env
DATABASE_URL=mysql://liberty:your_secure_password@localhost:3306/liberty_db
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
```

### 4. Build with MySQL Support

```bash
cd crates/liberty-server

# Build with MySQL feature (already enabled in Cargo.toml)
cargo build --release

# The mysql feature is already enabled in Cargo.toml:
# sqlx = { version = "0.7", features = ["runtime-tokio", "sqlite", "mysql", ...] }
```

### 5. Run the Server

```bash
cd ../../  # Back to project root
./start.sh
```

The server will automatically detect MySQL from the DATABASE_URL and initialize the schema.

---

## Migrating from SQLite to MySQL

### Step 1: Backup Your SQLite Database

```bash
cp liberty.db liberty.db.backup.$(date +%Y%m%d_%H%M%S)
```

### Step 2: Export SQLite Data

```bash
# Export to SQL dump
sqlite3 liberty.db ".dump" > sqlite_dump.sql

# Or export specific tables
sqlite3 liberty.db ".dump users" > users.sql
sqlite3 liberty.db ".dump servers" > servers.sql
```

### Step 3: Prepare MySQL Database

Follow steps 1-2 from "Quick Start" above to create the MySQL database.

### Step 4: Convert and Import Data

**Important:** SQL syntax differs between SQLite and MySQL. Here's a conversion script:

```bash
#!/bin/bash
# convert_sqlite_to_mysql.sh

# Remove SQLite-specific pragmas and commands
sed -i 's/PRAGMA.*;//g' sqlite_dump.sql
sed -i 's/BEGIN TRANSACTION;//g' sqlite_dump.sql
sed -i 's/COMMIT;//g' sqlite_dump.sql

# Convert data types
sed -i 's/INTEGER PRIMARY KEY AUTOINCREMENT/INT AUTO_INCREMENT PRIMARY KEY/g' sqlite_dump.sql
sed -i 's/INTEGER/INT/g' sqlite_dump.sql
sed -i 's/TEXT/VARCHAR(255)/g' sqlite_dump.sql

# Handle boolean values
sed -i "s/'true'/1/g" sqlite_dump.sql
sed -i "s/'false'/0/g" sqlite_dump.sql

# Convert date format if needed (SQLite: ISO8601, MySQL: compatible)
# MySQL accepts ISO8601 strings, so this usually works as-is
```

**Manual Table-by-Table Migration (Recommended for Production):**

```sql
-- In MySQL, create the schema first (this happens automatically on first run)
-- Then import data:

-- Users table
INSERT INTO users (id, username, discriminator, email, password_hash, 
                   avatar, banner, bio, status, custom_status, verified, 
                   mfa_enabled, created_at, updated_at)
SELECT id, username, discriminator, email, password_hash,
       avatar, banner, bio, status, custom_status, 
       CASE WHEN verified = 'true' THEN 1 ELSE 0 END,
       CASE WHEN mfa_enabled = 'true' THEN 1 ELSE 0 END,
       created_at, updated_at
FROM sqlite_users;

-- Repeat for other tables...
```

**Using a Migration Tool:**

```bash
# Option 1: pgloader (supports SQLite to MySQL)
# Install pgloader
sudo apt install pgloader

# Create load script
# pgloader does not directly support SQLite to MySQL, 
# so use intermediate conversion or Python script

# Option 2: Python script with SQLAlchemy
pip install sqlalchemy pandas pymysql

# Create migration script
```

### Step 5: Python Migration Script (Recommended)

Create `migrate_sqlite_to_mysql.py`:

```python
#!/usr/bin/env python3
"""
SQLite to MySQL Migration Script for LIBERTY Server
"""

import sqlite3
import pymysql
import sys
from datetime import datetime

# Configuration
SQLITE_DB = "liberty.db"
MYSQL_HOST = "localhost"
MYSQL_PORT = 3306
MYSQL_USER = "liberty"
MYSQL_PASSWORD = "your_secure_password"
MYSQL_DB = "liberty_db"

def connect_sqlite():
    return sqlite3.connect(SQLITE_DB)

def connect_mysql():
    return pymysql.connect(
        host=MYSQL_HOST,
        port=MYSQL_PORT,
        user=MYSQL_USER,
        password=MYSQL_PASSWORD,
        database=MYSQL_DB,
        charset='utf8mb4'
    )

def migrate_table(sqlite_cur, mysql_cur, table_name, columns):
    """Migrate a single table"""
    print(f"Migrating {table_name}...")
    
    # Fetch from SQLite
    sqlite_cur.execute(f"SELECT * FROM {table_name}")
    rows = sqlite_cur.fetchall()
    
    if not rows:
        print(f"  No data in {table_name}")
        return
    
    # Build insert query
    placeholders = ', '.join(['%s'] * len(columns))
    query = f"INSERT INTO {table_name} ({', '.join(columns)}) VALUES ({placeholders})"
    
    # Convert and insert
    count = 0
    for row in rows:
        try:
            # Convert booleans and dates if needed
            converted = []
            for i, col in enumerate(row):
                if col is None:
                    converted.append(None)
                elif isinstance(col, str) and col.lower() in ('true', 'false'):
                    converted.append(1 if col.lower() == 'true' else 0)
                else:
                    converted.append(col)
            
            mysql_cur.execute(query, converted)
            count += 1
        except Exception as e:
            print(f"  Error on row {count}: {e}")
            continue
    
    print(f"  Migrated {count} rows")

def main():
    print("=" * 60)
    print("LIBERTY: SQLite to MySQL Migration")
    print("=" * 60)
    
    sqlite_conn = connect_sqlite()
    mysql_conn = connect_mysql()
    
    sqlite_cur = sqlite_conn.cursor()
    mysql_cur = mysql_conn.cursor()
    
    try:
        # Migrate tables in correct order (respecting foreign keys)
        tables = [
            ("users", ["id", "username", "discriminator", "email", "password_hash", 
                      "avatar", "banner", "bio", "status", "custom_status", 
                      "verified", "mfa_enabled", "created_at", "updated_at"]),
            ("servers", ["id", "name", "description", "icon", "banner", 
                        "owner_id", "region", "afk_timeout", "afk_channel_id",
                        "system_channel_id", "verification_level", "content_filter",
                        "notification_level", "created_at", "updated_at", "max_members"]),
            ("channels", ["id", "server_id", "parent_id", "name", "type",
                        "position", "topic", "nsfw", "bitrate", "user_limit",
                        "rate_limit", "created_at", "updated_at"]),
            ("server_members", ["server_id", "user_id", "nickname", "avatar",
                               "joined_at", "premium_since", "deaf", "mute", "pending"]),
            ("messages", ["id", "channel_id", "author_id", "content", "edited_at",
                        "tts", "mention_everyone", "pinned", "created_at"]),
        ]
        
        for table, columns in tables:
            migrate_table(sqlite_cur, mysql_cur, table, columns)
        
        mysql_conn.commit()
        print("\n" + "=" * 60)
        print("Migration completed successfully!")
        print("=" * 60)
        
    except Exception as e:
        print(f"\nError: {e}")
        mysql_conn.rollback()
        sys.exit(1)
    finally:
        sqlite_conn.close()
        mysql_conn.close()

if __name__ == "__main__":
    main()
```

Run the migration:
```bash
python3 migrate_sqlite_to_mysql.py
```

### Step 6: Verify and Switch

1. Start the server with MySQL:
```bash
# Ensure .env has MySQL URL
export DATABASE_URL="mysql://liberty:pass@localhost:3306/liberty_db"
./start.sh
```

2. Verify data integrity:
- Check user count matches
- Test login with existing accounts
- Verify messages and servers are accessible

3. Keep SQLite backup until you're confident the migration is successful.

---

## Configuration Reference

### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | Connection string | `mysql://user:pass@host:3306/db` |
| `DB_MAX_CONNECTIONS` | Pool size | `100` |
| `DB_CONNECT_TIMEOUT` | Connection timeout (seconds) | `30` |
| `DB_IDLE_TIMEOUT` | Idle timeout (seconds) | `600` |

### MySQL Connection URL Format

```
mysql://[user[:password]@][host][:port][/database][?options]
```

Examples:
- `mysql://root:secret@localhost/liberty_db`
- `mysql://liberty:pass@127.0.0.1:3306/liberty_db`
- `mysql://user:pass@192.168.1.100:3306/liberty_db?charset=utf8mb4`

---

## Troubleshooting

### Connection Refused
```
Error: Connection refused (os error 111)
```
**Solution:**
- Check MySQL is running: `sudo systemctl status mysql`
- Check firewall: `sudo ufw allow 3306`
- Verify bind-address in `/etc/mysql/mysql.conf.d/mysqld.cnf`:
  ```
  bind-address = 0.0.0.0  # For remote connections
  # OR
  bind-address = 127.0.0.1  # For local only
  ```

### Access Denied
```
Error: Access denied for user 'liberty'@'localhost'
```
**Solution:**
- Verify username/password
- Check user exists: `SELECT user, host FROM mysql.user;`
- Re-create user if needed:
  ```sql
  DROP USER 'liberty'@'localhost';
  CREATE USER 'liberty'@'localhost' IDENTIFIED BY 'new_password';
  GRANT ALL PRIVILEGES ON liberty_db.* TO 'liberty'@'localhost';
  FLUSH PRIVILEGES;
  ```

### Unknown Database
```
Error: Unknown database 'liberty_db'
```
**Solution:**
- Create database: `CREATE DATABASE liberty_db;`

### Character Set Issues
```
Error: Incorrect string value
```
**Solution:**
- Ensure utf8mb4 charset:
  ```sql
  ALTER DATABASE liberty_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  ```

---

## Performance Tuning

### MySQL Configuration (my.cnf)

Add to `/etc/mysql/mysql.conf.d/mysqld.cnf`:

```ini
[mysqld]
# Connection settings
max_connections = 200
wait_timeout = 600
interactive_timeout = 600

# Buffer pool (adjust to 70% of available RAM)
innodb_buffer_pool_size = 1G

# Logging
slow_query_log = 1
slow_query_log_file = /var/log/mysql/slow.log
long_query_time = 2

# Character set
character-set-server = utf8mb4
collation-server = utf8mb4_unicode_ci

# For high concurrency
innodb_flush_log_at_trx_commit = 2
innodb_flush_method = O_DIRECT
```

Restart MySQL:
```bash
sudo systemctl restart mysql
```

---

## Security Best Practices

1. **Use Strong Passwords**
   ```sql
   ALTER USER 'liberty'@'localhost' IDENTIFIED BY 'VeryStrongP@ssw0rd!';
   ```

2. **Restrict Network Access**
   - Only open port 3306 to specific IPs
   - Use firewall rules
   - Consider VPN for remote access

3. **Enable SSL (Production)**
   ```env
   DATABASE_URL=mysql://user:pass@host/db?ssl-mode=REQUIRED
   ```

4. **Regular Backups**
   ```bash
   # Automated daily backup
   mysqldump -u liberty -p liberty_db | gzip > backup_$(date +%Y%m%d).sql.gz
   ```

5. **Separate Read/Write Replicas (Scale)**
   - Use MySQL replication for read scaling
   - Configure application to use read replicas for queries

---

## Rollback Plan

If MySQL migration fails:

1. Stop the server: `pkill liberty-server`
2. Switch back to SQLite:
   ```bash
   # Edit .env
   DATABASE_URL=sqlite:liberty.db
   ```
3. If data was corrupted, restore from backup:
   ```bash
   cp liberty.db.backup.20240404_120000 liberty.db
   ```
4. Restart with SQLite

---

## Additional Resources

- [MySQL 8.0 Documentation](https://dev.mysql.com/doc/refman/8.0/en/)
- [SQLx MySQL Support](https://github.com/launchbadge/sqlx#compile-time-verification)
- [MySQL Docker Images](https://hub.docker.com/_/mysql)

---

## Support

For issues or questions:
1. Check server logs: `tail -f /tmp/server.log`
2. Enable debug logging: `RUST_LOG=debug ./start.sh`
3. Verify MySQL connectivity: `mysql -u liberty -p -h localhost`
