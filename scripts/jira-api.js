const axios = require('axios');
const logger = require('./logger');

const RATE_LIMIT_RETRY_DELAY_MS = 1000;
const MAX_RETRIES = 3;
const PAGE_SIZE = 100;

class JiraApi {
  constructor(baseURL, email, apiToken) {
    this.baseURL = baseURL.replace(/\/+$/, '');
    this.email = email;
    this.apiToken = apiToken;
    this.authHeader = `Basic ${Buffer.from(`${email}:${apiToken}`).toString('base64')}`;
    this.customFieldMap = null;
    this.issueTypeMap = null;

    this.client = axios.create({
      baseURL: `${this.baseURL}/rest/api/3`,
      headers: {
        Authorization: this.authHeader,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
  }

  _handleRateLimit(response) {
    if (response.status === 429) {
      const retryAfter = parseInt(response.headers['retry-after'], 10) || RATE_LIMIT_RETRY_DELAY_MS / 1000;
      logger.warn(`Rate limited. Retrying after ${retryAfter}s`);
      return new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
    }
    return Promise.resolve();
  }

  async _requestWithRetry(config, retries = MAX_RETRIES) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await this.client.request(config);
        return response;
      } catch (error) {
        if (error.response) {
          if (error.response.status === 429) {
            await this._handleRateLimit(error.response);
            continue;
          }
          if (error.response.status === 401) {
            throw new Error('Authentication failed. Check your JIRA_EMAIL and JIRA_API_TOKEN.');
          }
          if (error.response.status === 404) {
            throw new Error(`Resource not found: ${config.url}. Check JIRA_BASE_URL and JIRA_PROJECT_KEY.`);
          }
        }
        if (attempt === retries) {
          throw error;
        }
        const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
        logger.warn(`Request failed (attempt ${attempt}/${retries}). Retrying in ${delay}ms`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  async _discoverCustomFields() {
    if (this.customFieldMap) return;

    logger.info('Discovering custom fields from Jira...');
    const response = await this._requestWithRetry({ method: 'GET', url: '/field' });
    const fields = response.data;

    this.customFieldMap = {};
    for (const field of fields) {
      if (field.custom) {
        this.customFieldMap[field.name.toLowerCase()] = field.id;
      }
    }

    logger.debug(`Discovered ${Object.keys(this.customFieldMap).length} custom fields`);
  }

  _getCustomFieldId(name) {
    if (!this.customFieldMap) return null;
    return this.customFieldMap[name.toLowerCase()] || null;
  }

  async _discoverIssueTypes() {
    if (this.issueTypeMap) return;

    logger.info('Discovering issue types from Jira...');
    const response = await this._requestWithRetry({ method: 'GET', url: '/issuetype' });
    const types = response.data;

    this.issueTypeMap = {};
    for (const type of types) {
      this.issueTypeMap[type.name.toLowerCase()] = {
        id: type.id,
        name: type.name,
        subtask: type.subtask,
      };
    }

    logger.debug(`Discovered ${Object.keys(this.issueTypeMap).length} issue types`);
  }

  async _convertIssueTypeName(typeName) {
    await this._discoverIssueTypes();
    const key = typeName.toLowerCase();
    return this.issueTypeMap[key] || null;
  }

  async getAllIssues(projectKey) {
    await this._discoverCustomFields();

    const jql = `project = "${projectKey}" ORDER BY created ASC`;
    const allIssues = [];
    let nextPageToken = null;
    let pageCount = 0;

    logger.info(`Fetching all issues for project "${projectKey}"...`);

    do {
      const requestData = {
        jql,
        maxResults: PAGE_SIZE,
        fields: [
          'summary',
          'description',
          'issuetype',
          'priority',
          'labels',
          'assignee',
          'reporter',
          'status',
          'created',
          'updated',
          'project',
          'parent',
          'issuelinks',
          'attachment',
          'comment',
          'resolution',
        ],
        expand: 'renderedFields',
      };

      if (nextPageToken) {
        requestData.nextPageToken = nextPageToken;
      }

      const response = await this._requestWithRetry({
        method: 'POST',
        url: '/search/jql',
        data: requestData,
      });

      const data = response.data;
      const issues = data.issues || [];

      for (const issue of issues) {
        const enriched = await this._enrichIssue(issue);
        allIssues.push(enriched);
      }

      nextPageToken = data.nextPageToken || null;
      pageCount++;
      logger.info(`  Page ${pageCount}: fetched ${issues.length} issues (total: ${allIssues.length})`);
    } while (nextPageToken);

    logger.info(`Fetched ${allIssues.length} issues total`);
    return allIssues;
  }

  async getIssue(issueKey) {
    await this._discoverCustomFields();

    const response = await this._requestWithRetry({
      method: 'GET',
      url: `/issue/${issueKey}`,
      params: {
        fields: [
          'summary',
          'description',
          'issuetype',
          'priority',
          'labels',
          'assignee',
          'reporter',
          'status',
          'created',
          'updated',
          'project',
          'parent',
          'issuelinks',
          'attachment',
          'comment',
          'resolution',
        ].join(','),
        expand: ['renderedFields'],
      },
    });

    return this._enrichIssue(response.data);
  }

  async _enrichIssue(issue) {
    const fields = issue.fields || {};
    const enriched = {
      id: issue.id,
      key: issue.key,
      self: issue.self,
      summary: fields.summary || '',
      description: fields.description || '',
      descriptionHtml: (fields.renderedFields && fields.renderedFields.description) || '',
      issueType: (fields.issuetype && fields.issuetype.name) || 'Unknown',
      issueTypeId: (fields.issuetype && fields.issuetype.id) || null,
      priority: (fields.priority && fields.priority.name) || 'None',
      priorityId: (fields.priority && fields.priority.id) || null,
      labels: fields.labels || [],
      assignee: fields.assignee ? fields.assignee.displayName : 'Unassigned',
      assigneeEmail: fields.assignee ? fields.assignee.emailAddress : null,
      reporter: fields.reporter ? fields.reporter.displayName : 'Unknown',
      reporterEmail: fields.reporter ? fields.reporter.emailAddress : null,
      status: (fields.status && fields.status.name) || 'Unknown',
      statusCategory: (fields.status && fields.status.statusCategory && fields.status.statusCategory.name) || '',
      created: fields.created || null,
      updated: fields.updated || null,
      projectKey: (fields.project && fields.project.key) || '',
      projectName: (fields.project && fields.project.name) || '',
      parent: null,
      subtasks: [],
      linkedIssues: [],
      attachments: [],
      comments: [],
      epicLink: null,
      epicName: null,
      storyPoints: null,
      sprint: null,
      businessValue: null,
      acceptanceCriteria: null,
    };

    if (fields.parent) {
      enriched.parent = {
        key: fields.parent.key,
        id: fields.parent.id,
        summary: (fields.parent.fields && fields.parent.fields.summary) || null,
      };
    }

    if (fields.subtasks && fields.subtasks.length > 0) {
      enriched.subtasks = fields.subtasks.map((st) => ({
        key: st.key,
        id: st.id,
        summary: st.fields ? st.fields.summary : null,
      }));
    }

    if (fields.issuelinks && fields.issuelinks.length > 0) {
      for (const link of fields.issuelinks) {
        if (link.inwardIssue) {
          enriched.linkedIssues.push({
            key: link.inwardIssue.key,
            summary: link.inwardIssue.fields ? link.inwardIssue.fields.summary : null,
            type: link.type ? link.type.inward : 'related to',
          });
        }
        if (link.outwardIssue) {
          enriched.linkedIssues.push({
            key: link.outwardIssue.key,
            summary: link.outwardIssue.fields ? link.outwardIssue.fields.summary : null,
            type: link.type ? link.type.outward : 'related to',
          });
        }
      }
    }

    if (fields.attachment && fields.attachment.length > 0) {
      enriched.attachments = fields.attachment.map((att) => ({
        id: att.id,
        filename: att.filename,
        mimeType: att.mimeType,
        size: att.size,
        created: att.created,
        author: att.author ? att.author.displayName : 'Unknown',
        url: att.content || '',
      }));
    }

    if (fields.comment && fields.comment.comments) {
      enriched.comments = fields.comment.comments.map((c) => ({
        id: c.id,
        author: c.author ? c.author.displayName : 'Unknown',
        body: c.body || '',
        created: c.created,
        updated: c.updated,
      }));
    }

    const epicLinkFieldId = this._getCustomFieldId('epic link');
    if (epicLinkFieldId && fields[epicLinkFieldId]) {
      enriched.epicLink = fields[epicLinkFieldId];
    }

    const epicNameFieldId = this._getCustomFieldId('epic name');
    if (epicNameFieldId && fields[epicNameFieldId]) {
      enriched.epicName = fields[epicNameFieldId];
    }

    const storyPointsFieldId = this._getCustomFieldId('story points');
    if (storyPointsFieldId && fields[storyPointsFieldId] !== undefined) {
      enriched.storyPoints = fields[storyPointsFieldId];
    }

    const sprintFieldId = this._getCustomFieldId('sprint');
    if (sprintFieldId && fields[sprintFieldId]) {
      const sprintData = fields[sprintFieldId];
      if (Array.isArray(sprintData) && sprintData.length > 0) {
        enriched.sprint = sprintData[0];
      } else if (typeof sprintData === 'object') {
        enriched.sprint = sprintData;
      }
    }

    const businessValueFieldId = this._getCustomFieldId('business value');
    if (businessValueFieldId && fields[businessValueFieldId] !== undefined) {
      enriched.businessValue = fields[businessValueFieldId];
    }

    const acceptanceCriteriaFieldId = this._getCustomFieldId('acceptance criteria');
    if (acceptanceCriteriaFieldId && fields[acceptanceCriteriaFieldId] !== undefined) {
      enriched.acceptanceCriteria = fields[acceptanceCriteriaFieldId];
    }

    const businessRulesFieldId = this._getCustomFieldId('business rules');
    if (businessRulesFieldId && fields[businessRulesFieldId] !== undefined) {
      enriched.businessRules = fields[businessRulesFieldId];
    }

    if (enriched.description && typeof enriched.description === 'object') {
      const descContent = enriched.description;
      const parts = [];
      if (descContent.content) {
        for (const block of descContent.content) {
          if (block.content) {
            for (const item of block.content) {
              if (item.text) {
                parts.push(item.text);
              }
              if (item.type === 'hardBreak') {
                parts.push('\n');
              }
            }
            if (block.type === 'paragraph') {
              parts.push('\n\n');
            }
          }
        }
      }
      enriched.description = parts.join('').trim();
    }

    return enriched;
  }

  async testConnection() {
    try {
      await this._requestWithRetry({ method: 'GET', url: '/myself' });
      logger.info('Jira connection successful');
      return true;
    } catch (error) {
      logger.error(`Jira connection failed: ${error.message}`);
      return false;
    }
  }
}

module.exports = JiraApi;
