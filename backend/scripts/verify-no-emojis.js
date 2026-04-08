#!/usr/bin/env node

/**
 * Script de Verificação Final - PSO Brasil Cyber-Brasil
 * Verifica se não há emojis no código e se todos os ícones são vetoriais
 */

const fs = require('fs');
const path = require('path');

// Lista de emojis para detectar
const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA70}-\u{1FAFF}]/gu;

// Extensões de arquivo para verificar
const extensions = ['.js', '.jsx', '.ts', '.tsx', '.html', '.ejs', '.md', '.json'];

// Diretórios a ignorar
const ignoreDirs = ['node_modules', '.git', 'dist', 'build', '.next', 'coverage'];

// Arquivos a ignorar
const ignoreFiles = ['package-lock.json', 'yarn.lock'];

function findFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !ignoreDirs.includes(file)) {
      findFiles(filePath, fileList);
    } else if (stat.isFile() && !ignoreFiles.includes(file)) {
      const ext = path.extname(file);
      if (extensions.includes(ext)) {
        fileList.push(filePath);
      }
    }
  });
  
  return fileList;
}

function checkFileForEmojis(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const issues = [];
    
    lines.forEach((line, index) => {
      const emojis = line.match(emojiRegex);
      if (emojis) {
        issues.push({
          line: index + 1,
          content: line.trim(),
          emojis: emojis
        });
      }
    });
    
    return issues;
  } catch (error) {
    console.error(`Erro ao ler arquivo ${filePath}:`, error.message);
    return [];
  }
}

function checkForLucideIcons(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lucideImports = content.match(/from ['"]lucide-react['"]/g) || [];
    const lucideUsage = content.match(/lucide-react\/\w+/g) || [];
    
    return {
      imports: lucideImports.length,
      usage: lucideUsage.length,
      hasLucide: lucideImports.length > 0 || lucideUsage.length > 0
    };
  } catch (error) {
    console.error(`Erro ao ler arquivo ${filePath}:`, error.message);
    return { imports: 0, usage: 0, hasLucide: false };
  }
}

function checkForSvgIcons(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const svgPatterns = [
      /<svg[^>]*>/gi,
      /<path[^>]*>/gi,
      /<circle[^>]*>/gi,
      /<rect[^>]*>/gi,
      /\.svg/gi
    ];
    
    let svgCount = 0;
    svgPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) svgCount += matches.length;
    });
    
    return svgCount > 0;
  } catch (error) {
    console.error(`Erro ao ler arquivo ${filePath}:`, error.message);
    return false;
  }
}

function main() {
  console.log('='.repeat(60));
  console.log('PSO Brasil - Verificação Final Cyber-Brasil');
  console.log('='.repeat(60));
  
  const files = findFiles('.');
  console.log(`\nVerificando ${files.length} arquivos...`);
  
  let totalEmojiIssues = 0;
  let filesWithEmojis = 0;
  let filesWithLucide = 0;
  let filesWithSvg = 0;
  
  console.log('\n1. Verificando EMOJIS (PROIBIDOS):');
  console.log('-'.repeat(40));
  
  files.forEach(filePath => {
    const issues = checkFileForEmojis(filePath);
    if (issues.length > 0) {
      filesWithEmojis++;
      totalEmojiIssues += issues.length;
      console.log(`\n${filePath}:`);
      issues.forEach(issue => {
        console.log(`  Linha ${issue.line}: ${issue.emojis.join(', ')}`);
        console.log(`  Conteúdo: ${issue.content.substring(0, 80)}...`);
      });
    }
  });
  
  console.log('\n2. Verificando ÍCONES LUCIDE REACT:');
  console.log('-'.repeat(40));
  
  files.forEach(filePath => {
    const lucideInfo = checkForLucideIcons(filePath);
    if (lucideInfo.hasLucide) {
      filesWithLucide++;
      console.log(`\n${filePath}:`);
      console.log(`  Imports: ${lucideInfo.imports}`);
      console.log(`  Usage: ${lucideInfo.usage}`);
    }
  });
  
  console.log('\n3. Verificando ÍCONES SVG:');
  console.log('-'.repeat(40));
  
  files.forEach(filePath => {
    const hasSvg = checkForSvgIcons(filePath);
    if (hasSvg) {
      filesWithSvg++;
      console.log(`\n${filePath}: Contém ícones SVG`);
    }
  });
  
  // Relatório final
  console.log('\n' + '='.repeat(60));
  console.log('RELATÓRIO FINAL:');
  console.log('='.repeat(60));
  
  console.log(`\nArquivos verificados: ${files.length}`);
  console.log(`Arquivos com EMOJIS: ${filesWithEmojis}`);
  console.log(`Total de EMOJIS encontrados: ${totalEmojiIssues}`);
  console.log(`Arquivos com ícones Lucide: ${filesWithLucide}`);
  console.log(`Arquivos com ícones SVG: ${filesWithSvg}`);
  
  if (totalEmojiIssues > 0) {
    console.log('\n' + 'X'.repeat(60));
    console.log('ERRO: ENCONTRADOS EMOJIS NO CÓDIGO!');
    console.log('Por favor, remova todos os emojis e use apenas ícones Lucide React.');
    console.log('X'.repeat(60));
    process.exit(1);
  } else {
    console.log('\n' + 'V'.repeat(60));
    console.log('SUCESSO: NENHUM EMOJI ENCONTRADO!');
    console.log('Todos os ícones são vetoriais (Lucide React ou SVG).');
    console.log('V'.repeat(60));
    
    if (filesWithLucide > 0) {
      console.log(`\nÓtimo! ${filesWithLucide} arquivos usam ícones Lucide React.`);
    }
    
    if (filesWithSvg > 0) {
      console.log(`Ótimo! ${filesWithSvg} arquivos usam ícones SVG.`);
    }
    
    console.log('\nProjeto está pronto para deploy Cyber-Brasil! ');
  }
}

if (require.main === module) {
  main();
}
