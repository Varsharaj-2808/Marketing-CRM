const fs = require('fs/promises');
const path = require('path');
const logger = require('./logger');

class FileManager {
  constructor(docsRoot) {
    this.docsRoot = path.resolve(docsRoot);
  }

  async ensureDirectory(dirPath) {
    const fullPath = path.resolve(this.docsRoot, dirPath);
    try {
      await fs.mkdir(fullPath, { recursive: true });
      return fullPath;
    } catch (error) {
      logger.error(`Failed to create directory ${fullPath}: ${error.message}`);
      throw error;
    }
  }

  async pathExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async readFile(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      return content;
    } catch (error) {
      if (error.code === 'ENOENT') return null;
      throw error;
    }
  }

  async writeFile(filePath, content) {
    const fullPath = path.resolve(this.docsRoot, filePath);
    const dir = path.dirname(fullPath);

    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(fullPath, content, 'utf8');

    return fullPath;
  }

  async writeMarkdownFile(relativePath, content) {
    const fullPath = await this.writeFile(relativePath, content);
    logger.debug(`Written: ${path.relative(this.docsRoot, fullPath)}`);
    return fullPath;
  }

  async writeFolderReadme(folderName, content) {
    const relativePath = path.join(folderName, 'README.md');
    const fullPath = await this.writeFile(relativePath, content);

    logger.debug(`README updated: ${path.relative(this.docsRoot, fullPath)}`);
    return fullPath;
  }

  async shouldOverwrite(filePath, newContent) {
    const existingContent = await this.readFile(filePath);
    if (existingContent === null) return true;

    return existingContent !== newContent;
  }

  async deleteFile(filePath) {
    try {
      const fullPath = path.resolve(this.docsRoot, filePath);
      await fs.unlink(fullPath);
      return true;
    } catch (error) {
      if (error.code === 'ENOENT') return false;
      logger.warn(`Failed to delete ${filePath}: ${error.message}`);
      return false;
    }
  }

  async deleteDirectory(dirPath) {
    const fullPath = path.resolve(this.docsRoot, dirPath);
    try {
      await fs.rm(fullPath, { recursive: true, force: true });
      logger.debug(`Deleted directory: ${dirPath}`);
      return true;
    } catch (error) {
      if (error.code === 'ENOENT') return false;
      logger.warn(`Failed to delete directory ${dirPath}: ${error.message}`);
      return false;
    }
  }

  async listSubdirectories(parentFolder) {
    const fullPath = path.resolve(this.docsRoot, parentFolder);
    try {
      const entries = await fs.readdir(fullPath, { withFileTypes: true });
      return entries
        .filter((e) => e.isDirectory())
        .map((e) => path.join(parentFolder, e.name));
    } catch {
      return [];
    }
  }

  async listFiles(directoryPath, exclude = ['README.md']) {
    const fullPath = path.resolve(this.docsRoot, directoryPath);
    try {
      const entries = await fs.readdir(fullPath, { withFileTypes: true });
      return entries
        .filter((e) => e.isFile() && !exclude.includes(e.name) && e.name.endsWith('.md'))
        .map((e) => path.join(directoryPath, e.name));
    } catch {
      return [];
    }
  }

  async deleteStaleFiles(currentFiles) {
    const filesByDir = {};
    for (const file of currentFiles) {
      const dir = path.dirname(file);
      if (!filesByDir[dir]) filesByDir[dir] = [];
      filesByDir[dir].push(path.basename(file));
    }

    let deletedCount = 0;
    for (const [dirPath, keepNames] of Object.entries(filesByDir)) {
      const allFiles = await this.listFiles(dirPath);
      const keepSet = new Set(keepNames);

      for (const filePath of allFiles) {
        const basename = path.basename(filePath);
        if (!keepSet.has(basename)) {
          await this.deleteFile(filePath);
          deletedCount++;
        }
      }
    }

    return deletedCount;
  }

  async deleteOrphanedSubdirectories(parentFolder, keepDirNames) {
    const subdirs = await this.listSubdirectories(parentFolder);
    const keepSet = new Set(keepDirNames);
    let deletedCount = 0;

    for (const dir of subdirs) {
      const dirName = path.basename(dir);
      if (!keepSet.has(dirName) && !dirName.startsWith('.')) {
        await this.deleteDirectory(dir);
        deletedCount++;
      }
    }

    return deletedCount;
  }
}

module.exports = FileManager;
