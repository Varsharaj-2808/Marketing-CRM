require('dotenv').config();
const path = require('path');
const JiraApi = require('./jira-api');
const MarkdownGenerator = require('./markdown-generator');
const FileManager = require('./file-manager');
const logger = require('./logger');

const DOCS_ROOT = path.resolve(__dirname, '..', 'docs');

const FOLDER_CONFIG = {
  '03_Epics': 'High-level epics organizing the feature backlog.',
  '04_Features': 'Detailed feature descriptions for the Marketing CRM.',
  '05_User_Stories': 'Agile user stories organized by epic, with tasks and sub-tasks.',
  '06_Screens': 'Screens and wireframes extracted from issue attachments.',
  '07_Acceptance_Criteria': 'Acceptance criteria for each user story and feature.',
  '08_Business_Rules': 'Business logic rules and constraints for the CRM system.',
  '09_API_Documentation': 'API endpoint documentation for API-related issues.',
  '10_Test_Cases': 'Test cases derived from testing-related issues.',
};

class JiraSync {
  constructor() {
    this.api = null;
    this.generator = new MarkdownGenerator();
    this.fileManager = new FileManager(DOCS_ROOT);
    this.stats = {
      fetched: {},
      generated: {},
      errors: [],
      foldersUpdated: [],
    };
  }

  _validateConfig() {
    const required = ['JIRA_BASE_URL', 'JIRA_EMAIL', 'JIRA_API_TOKEN', 'JIRA_PROJECT_KEY'];
    const missing = required.filter((key) => !process.env[key]);

    if (missing.length > 0) {
      logger.error(`Missing required environment variables: ${missing.join(', ')}`);
      logger.error('Ensure the following are set in your .env file:');
      required.forEach((key) => logger.error(`  ${key}=`));
      process.exit(1);
    }
  }

  _buildHierarchy(issues) {
    const epics = [];
    const stories = [];
    const tasks = [];

    for (const issue of issues) {
      const type = issue.issueType.toLowerCase();
      if (type === 'epic') {
        epics.push(issue);
      } else if (type === 'story' || type === 'user story') {
        stories.push(issue);
      } else {
        tasks.push(issue);
      }
    }

    const epicByKey = {};
    for (const epic of epics) {
      epicByKey[epic.key] = epic;
    }

    const storyByKey = {};
    for (const story of stories) {
      storyByKey[story.key] = story;
    }

    const hierarchy = {};

    for (const epic of epics) {
      hierarchy[epic.key] = { epic, stories: {}, orphanedTasks: [] };
    }

    hierarchy.__orphaned__ = { epic: null, stories: {}, orphanedTasks: [] };

    for (const story of stories) {
      let epicKey = null;

      if (story.parent && epicByKey[story.parent.key]) {
        epicKey = story.parent.key;
      } else if (story.epicLink && epicByKey[story.epicLink]) {
        epicKey = story.epicLink;
      }

      const target = epicKey ? hierarchy[epicKey] : hierarchy.__orphaned__;
      target.stories[story.key] = { story, tasks: [] };
    }

    for (const epic of epics) {
      for (const story of Object.values(hierarchy[epic.key].stories)) {
        if (!story.story.epicLink && story.story.parent && epicByKey[story.story.parent.key]) {
          story.story.epicLink = epic.key;
        }
      }
    }

    for (const task of tasks) {
      const parentKey = task.parent ? task.parent.key : null;
      const parentIsStory = parentKey && storyByKey[parentKey];
      const parentIsEpic = parentKey && epicByKey[parentKey];

      if (parentIsStory) {
        const parentStory = storyByKey[parentKey];
        const epicKey = parentStory.epicLink
          ? parentStory.epicLink
          : (parentStory.parent && epicByKey[parentStory.parent.key]
            ? parentStory.parent.key
            : null);

        if (epicKey && hierarchy[epicKey]) {
          if (hierarchy[epicKey].stories[parentKey]) {
            hierarchy[epicKey].stories[parentKey].tasks.push(task);
          } else {
            hierarchy[epicKey].orphanedTasks.push(task);
          }
        } else {
          hierarchy.__orphaned__.orphanedTasks.push(task);
        }
      } else if (parentIsEpic) {
        const epicKey = parentKey;
        if (hierarchy[epicKey]) {
          hierarchy[epicKey].orphanedTasks.push(task);
        } else {
          hierarchy.__orphaned__.orphanedTasks.push(task);
        }
      } else {
        const epicKey = task.epicLink && epicByKey[task.epicLink] ? task.epicLink : null;
        const target = epicKey ? hierarchy[epicKey] : hierarchy.__orphaned__;
        target.orphanedTasks.push(task);
      }
    }

    return { hierarchy, epics, stories, tasks };
  }

  async _syncEpics(epics) {
    const folderName = '03_Epics';
    if (epics.length === 0) return;

    logger.section(`Syncing ${folderName} (${epics.length} epics)`);
    await this.fileManager.ensureDirectory(folderName);

    const writtenFiles = [];
    let updated = 0;
    let unchanged = 0;

    for (const epic of epics) {
      const fileName = this.generator.getReadableFileName(epic);
      const filePath = path.join(DOCS_ROOT, folderName, fileName);
      const content = this.generator.generateIssueMarkdown(epic);

      if (await this.fileManager.shouldOverwrite(filePath, content)) {
        await this.fileManager.writeMarkdownFile(path.join(folderName, fileName), content);
        updated++;
      } else {
        unchanged++;
      }
      writtenFiles.push(path.join(folderName, fileName));
    }

    this.stats.generated[folderName] = updated;
    this.stats.foldersUpdated.push(folderName);

    const staleCount = await this.fileManager.deleteStaleFiles(writtenFiles);
    logger.info(`  ${folderName}: ${updated} updated, ${unchanged} unchanged, ${staleCount} stale removed`);

    const readmeContent = this.generator.generateFolderReadme(folderName, FOLDER_CONFIG[folderName] || '');
    await this.fileManager.writeFolderReadme(folderName, readmeContent);
  }

  async _syncUserStories(hierarchy) {
    const parentFolder = '05_User_Stories';
    await this.fileManager.ensureDirectory(parentFolder);

    const generatedDirNames = [];
    let totalUpdated = 0;
    let totalUnchanged = 0;

    const epicEntries = Object.entries(hierarchy).filter(([key]) => key !== '__orphaned__');

    if (epicEntries.length === 0 && hierarchy.__orphaned__) {
      const hasOrphans = Object.keys(hierarchy.__orphaned__.stories).length > 0
        || hierarchy.__orphaned__.orphanedTasks.length > 0;
      if (hasOrphans) {
        epicEntries.push(['__orphaned__', hierarchy.__orphaned__]);
      }
    }

    const orphanedEntry = hierarchy.__orphaned__;
    const hasOrphans = Object.keys(orphanedEntry.stories).length > 0 || orphanedEntry.orphanedTasks.length > 0;

    const allWrittenFiles = [];

    for (const [epicKey, epicNode] of epicEntries) {
      let epicDisplayName;
      let epicSummary;

      if (epicKey === '__orphaned__') {
        epicDisplayName = '_Orphaned_Issues';
        epicSummary = 'Orphaned Issues';
      } else {
        epicSummary = epicNode.epic ? epicNode.epic.summary : epicKey;
        epicDisplayName = this.generator.getEpicFolderName(epicNode.epic || { key: epicKey, summary: epicSummary });
      }

      generatedDirNames.push(epicDisplayName);
      const folderBase = path.join(parentFolder, epicDisplayName);
      const tasksFolder = path.join(folderBase, 'Tasks');

      await this.fileManager.ensureDirectory(tasksFolder);

      const storyKeys = Object.keys(epicNode.stories);
      const orphanedCount = epicNode.orphanedTasks.length;
      const total = storyKeys.length + orphanedCount;

      if (total === 0) continue;

      logger.section(`Syncing ${folderBase} (${storyKeys.length} stories, ${orphanedCount} orphaned tasks)`);

      const writtenFiles = [];

      for (const storyKey of Object.keys(epicNode.stories)) {
        const storyNode = epicNode.stories[storyKey];
        const story = storyNode.story;

        const hierarchyInfo = {
          epic: epicNode.epic || null,
          childIssues: storyNode.tasks.map((t) => ({ key: t.key, summary: t.summary })),
        };

        const fileName = this.generator.getReadableFileName(story);
        const filePath = path.join(DOCS_ROOT, folderBase, fileName);
        const content = this.generator.generateIssueMarkdown(story, hierarchyInfo);

        if (await this.fileManager.shouldOverwrite(filePath, content)) {
          await this.fileManager.writeMarkdownFile(path.join(folderBase, fileName), content);
          totalUpdated++;
        } else {
          totalUnchanged++;
        }
        writtenFiles.push(path.join(folderBase, fileName));

        for (const task of storyNode.tasks) {
          const taskHierarchy = {
            epic: epicNode.epic || null,
            parentStory: story,
          };

          const taskFileName = this.generator.getReadableFileName(task);
          const taskFilePath = path.join(DOCS_ROOT, tasksFolder, taskFileName);
          const taskContent = this.generator.generateIssueMarkdown(task, taskHierarchy);

          if (await this.fileManager.shouldOverwrite(taskFilePath, taskContent)) {
            await this.fileManager.writeMarkdownFile(path.join(tasksFolder, taskFileName), taskContent);
            totalUpdated++;
          } else {
            totalUnchanged++;
          }
          writtenFiles.push(path.join(tasksFolder, taskFileName));
        }
      }

      for (const task of epicNode.orphanedTasks) {
        const taskHierarchy = {
          epic: epicNode.epic || null,
        };

        const taskFileName = this.generator.getReadableFileName(task);
        const taskFilePath = path.join(DOCS_ROOT, tasksFolder, taskFileName);
        const taskContent = this.generator.generateIssueMarkdown(task, taskHierarchy);

        if (await this.fileManager.shouldOverwrite(taskFilePath, taskContent)) {
          await this.fileManager.writeMarkdownFile(path.join(tasksFolder, taskFileName), taskContent);
          totalUpdated++;
        } else {
          totalUnchanged++;
        }
        writtenFiles.push(path.join(tasksFolder, taskFileName));
      }

      allWrittenFiles.push(...writtenFiles);

      const staleCount = await this.fileManager.deleteStaleFiles(writtenFiles);
      logger.info(`  ${epicDisplayName}: ${totalUpdated} updated, ${totalUnchanged} unchanged, ${staleCount} stale removed`);

      const readmeContent = epicNode.epic
        ? this.generator.generateEpicFolderReadme(epicNode.epic)
        : '# Orphaned Issues\n\nIssues without an assigned epic.\n\n_This folder is auto-generated._\n';
      await this.fileManager.writeFolderReadme(folderBase, readmeContent);
    }

    const orphanedDirCount = await this.fileManager.deleteOrphanedSubdirectories(parentFolder, generatedDirNames);
    if (orphanedDirCount > 0) {
      logger.info(`  Removed ${orphanedDirCount} stale epic folder(s) from ${parentFolder}`);
    }

    this.stats.generated[parentFolder] = totalUpdated;
    this.stats.foldersUpdated.push(parentFolder);

    const readmeContent = this.generator.generateFolderReadme(parentFolder, FOLDER_CONFIG[parentFolder] || '');
    await this.fileManager.writeFolderReadme(parentFolder, readmeContent);
  }

  async _syncScreens(issues) {
    const folderName = '06_Screens';
    const screenIssues = issues.filter((i) => this.generator.hasScreenAttachments(i));

    if (screenIssues.length === 0) return;

    logger.section(`Syncing ${folderName} (${screenIssues.length} issues with screenshots)`);
    await this.fileManager.ensureDirectory(folderName);

    const writtenFiles = [];
    let updated = 0;
    let unchanged = 0;

    for (const issue of screenIssues) {
      const fileName = this.generator.getScreenFileName(issue);
      const filePath = path.join(DOCS_ROOT, folderName, fileName);
      const content = this.generator.generateIssueMarkdown(issue);

      if (await this.fileManager.shouldOverwrite(filePath, content)) {
        await this.fileManager.writeMarkdownFile(path.join(folderName, fileName), content);
        updated++;
      } else {
        unchanged++;
      }
      writtenFiles.push(path.join(folderName, fileName));
    }

    this.stats.generated[folderName] = updated;
    this.stats.foldersUpdated.push(folderName);

    const staleCount = await this.fileManager.deleteStaleFiles(writtenFiles);
    logger.info(`  ${folderName}: ${updated} updated, ${unchanged} unchanged, ${staleCount} stale removed`);

    const readmeContent = this.generator.generateFolderReadme(folderName, FOLDER_CONFIG[folderName] || '');
    await this.fileManager.writeFolderReadme(folderName, readmeContent);
  }

  async _syncAcceptanceCriteria(issues) {
    const folderName = '07_Acceptance_Criteria';
    const acIssues = issues.filter((i) => this.generator.hasAcceptanceCriteria(i));

    if (acIssues.length === 0) return;

    logger.section(`Syncing ${folderName} (${acIssues.length} issues with AC)`);
    await this.fileManager.ensureDirectory(folderName);

    const writtenFiles = [];
    let updated = 0;
    let unchanged = 0;

    for (const issue of acIssues) {
      const content = this.generator.generateAcceptanceCriteriaDoc(issue);
      if (!content) continue;

      const fileName = this.generator.getAcceptanceCriteriaFileName(issue);
      const filePath = path.join(DOCS_ROOT, folderName, fileName);

      if (await this.fileManager.shouldOverwrite(filePath, content)) {
        await this.fileManager.writeMarkdownFile(path.join(folderName, fileName), content);
        updated++;
      } else {
        unchanged++;
      }
      writtenFiles.push(path.join(folderName, fileName));
    }

    this.stats.generated[folderName] = updated;
    if (!this.stats.foldersUpdated.includes(folderName)) {
      this.stats.foldersUpdated.push(folderName);
    }

    const staleCount = await this.fileManager.deleteStaleFiles(writtenFiles);
    logger.info(`  ${folderName}: ${updated} updated, ${unchanged} unchanged, ${staleCount} stale removed`);

    const readmeContent = this.generator.generateFolderReadme(folderName, FOLDER_CONFIG[folderName] || '');
    await this.fileManager.writeFolderReadme(folderName, readmeContent);
  }

  async _syncBusinessRules(issues) {
    const folderName = '08_Business_Rules';
    const brIssues = issues.filter((i) => this.generator.hasBusinessRules(i));

    if (brIssues.length === 0) {
      await this.fileManager.ensureDirectory(folderName);
      const readmeContent = this.generator.generateFolderReadme(folderName, FOLDER_CONFIG[folderName] || '');
      await this.fileManager.writeFolderReadme(folderName, readmeContent);
      return;
    }

    logger.section(`Syncing ${folderName} (${brIssues.length} issues with business rules)`);
    await this.fileManager.ensureDirectory(folderName);

    const writtenFiles = [];
    let updated = 0;
    let unchanged = 0;

    for (const issue of brIssues) {
      const content = this.generator.generateBusinessRulesDoc(issue);
      if (!content) continue;

      const fileName = this.generator.getBusinessRulesFileName(issue);
      const filePath = path.join(DOCS_ROOT, folderName, fileName);

      if (await this.fileManager.shouldOverwrite(filePath, content)) {
        await this.fileManager.writeMarkdownFile(path.join(folderName, fileName), content);
        updated++;
      } else {
        unchanged++;
      }
      writtenFiles.push(path.join(folderName, fileName));
    }

    this.stats.generated[folderName] = updated;
    if (!this.stats.foldersUpdated.includes(folderName)) {
      this.stats.foldersUpdated.push(folderName);
    }

    const staleCount = await this.fileManager.deleteStaleFiles(writtenFiles);
    logger.info(`  ${folderName}: ${updated} updated, ${unchanged} unchanged, ${staleCount} stale removed`);

    const readmeContent = this.generator.generateFolderReadme(folderName, FOLDER_CONFIG[folderName] || '');
    await this.fileManager.writeFolderReadme(folderName, readmeContent);
  }

  async _syncAPIDocs(issues) {
    const folderName = '09_API_Documentation';
    const apiIssues = issues.filter((i) => this.generator.isAPIRelated(i));

    if (apiIssues.length === 0) {
      await this.fileManager.ensureDirectory(folderName);
      const readmeContent = this.generator.generateFolderReadme(folderName, FOLDER_CONFIG[folderName] || '');
      await this.fileManager.writeFolderReadme(folderName, readmeContent);
      return;
    }

    logger.section(`Syncing ${folderName} (${apiIssues.length} API-related issues)`);
    await this.fileManager.ensureDirectory(folderName);

    const writtenFiles = [];
    let updated = 0;
    let unchanged = 0;

    for (const issue of apiIssues) {
      const fileName = this.generator.getAPIDocFileName(issue);
      const filePath = path.join(DOCS_ROOT, folderName, fileName);
      const content = this.generator.generateIssueMarkdown(issue);

      if (await this.fileManager.shouldOverwrite(filePath, content)) {
        await this.fileManager.writeMarkdownFile(path.join(folderName, fileName), content);
        updated++;
      } else {
        unchanged++;
      }
      writtenFiles.push(path.join(folderName, fileName));
    }

    this.stats.generated[folderName] = updated;
    if (!this.stats.foldersUpdated.includes(folderName)) {
      this.stats.foldersUpdated.push(folderName);
    }

    const staleCount = await this.fileManager.deleteStaleFiles(writtenFiles);
    logger.info(`  ${folderName}: ${updated} updated, ${unchanged} unchanged, ${staleCount} stale removed`);

    const readmeContent = this.generator.generateFolderReadme(folderName, FOLDER_CONFIG[folderName] || '');
    await this.fileManager.writeFolderReadme(folderName, readmeContent);
  }

  async _syncTestCases(issues) {
    const folderName = '10_Test_Cases';
    const testIssues = issues.filter((i) => this.generator.isTestRelated(i));

    if (testIssues.length === 0) {
      await this.fileManager.ensureDirectory(folderName);
      const readmeContent = this.generator.generateFolderReadme(folderName, FOLDER_CONFIG[folderName] || '');
      await this.fileManager.writeFolderReadme(folderName, readmeContent);
      return;
    }

    logger.section(`Syncing ${folderName} (${testIssues.length} testing-related issues)`);
    await this.fileManager.ensureDirectory(folderName);

    const writtenFiles = [];
    let updated = 0;
    let unchanged = 0;

    for (const issue of testIssues) {
      const fileName = this.generator.getTestCaseFileName(issue);
      const filePath = path.join(DOCS_ROOT, folderName, fileName);
      const content = this.generator.generateIssueMarkdown(issue);

      if (await this.fileManager.shouldOverwrite(filePath, content)) {
        await this.fileManager.writeMarkdownFile(path.join(folderName, fileName), content);
        updated++;
      } else {
        unchanged++;
      }
      writtenFiles.push(path.join(folderName, fileName));
    }

    this.stats.generated[folderName] = updated;
    if (!this.stats.foldersUpdated.includes(folderName)) {
      this.stats.foldersUpdated.push(folderName);
    }

    const staleCount = await this.fileManager.deleteStaleFiles(writtenFiles);
    logger.info(`  ${folderName}: ${updated} updated, ${unchanged} unchanged, ${staleCount} stale removed`);

    const readmeContent = this.generator.generateFolderReadme(folderName, FOLDER_CONFIG[folderName] || '');
    await this.fileManager.writeFolderReadme(folderName, readmeContent);
  }

  _logSummary() {
    logger.section('Sync Summary');

    for (const [key, value] of Object.entries(this.stats.fetched)) {
      if (value > 0) {
        logger.info(`Fetched ${value} ${key}`);
      }
    }

    logger.info('');

    for (const folder of this.stats.foldersUpdated) {
      const count = this.stats.generated[folder] || 0;
      logger.info(`Generated: docs/${folder}/ (${count} files)`);
    }

    if (this.stats.errors.length > 0) {
      logger.warn(`\n${this.stats.errors.length} error(s) during sync:`);
      for (const err of this.stats.errors) {
        logger.error(`  - ${err}`);
      }
    }

    logger.info('\nJira sync completed successfully.');
  }

  async run() {
    logger.section('Jira Documentation Sync');
    logger.info('Starting Jira sync process...');
    logger.startTimer('total');

    this._validateConfig();

    const {
      JIRA_BASE_URL: baseURL,
      JIRA_EMAIL: email,
      JIRA_API_TOKEN: apiToken,
      JIRA_PROJECT_KEY: projectKey,
    } = process.env;

    this.api = new JiraApi(baseURL, email, apiToken);

    const connected = await this.api.testConnection();
    if (!connected) {
      logger.error('Cannot proceed without a valid Jira connection.');
      process.exit(1);
    }

    try {
      logger.startTimer('fetch');
      const issues = await this.api.getAllIssues(projectKey);
      logger.endTimer('fetch');

      if (issues.length === 0) {
        logger.warn(`No issues found for project "${projectKey}". The project may be empty.`);
        logger.info('Sync completed with no issues to process.');
        return;
      }

      const { hierarchy, epics, stories, tasks } = this._buildHierarchy(issues);

      this.stats.fetched = {
        Epics: epics.length,
        Stories: stories.length,
        'Tasks/Sub-tasks': tasks.length,
      };

      await this._syncEpics(epics);
      await this._syncUserStories(hierarchy);
      await this._syncScreens(issues);
      await this._syncAcceptanceCriteria(issues);
      await this._syncBusinessRules(issues);
      await this._syncAPIDocs(issues);
      await this._syncTestCases(issues);

      logger.endTimer('total');
      this._logSummary();
    } catch (error) {
      logger.error(`Sync failed: ${error.message}`);
      if (error.response) {
        logger.error(`HTTP ${error.response.status}: ${JSON.stringify(error.response.data)}`);
      }
      logger.error(error.stack);
      process.exit(1);
    }
  }
}

const sync = new JiraSync();

if (require.main === module) {
  sync.run().catch((error) => {
    logger.error(`Unhandled error: ${error.message}`);
    process.exit(1);
  });
}

module.exports = JiraSync;
