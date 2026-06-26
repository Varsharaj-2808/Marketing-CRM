const logger = require('./logger');

class MarkdownGenerator {
  _formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toISOString().replace('T', ' ').substring(0, 19);
  }

  _formatDescription(description) {
    if (!description || description.trim() === '') {
      return 'No description provided.';
    }
    return description;
  }

  _sanitizeTitle(summary) {
    if (!summary) return 'untitled';
    let cleaned = summary
      .replace(/\[.*?\]\s*/g, '')
      .replace(/[<>:"/\\|?*]/g, '')
      .replace(/\s+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .substring(0, 80);
    return cleaned || 'untitled';
  }

  getReadableFileName(issue) {
    const key = issue.key;
    const title = this._sanitizeTitle(issue.summary);
    return `${key}_${title}.md`;
  }

  getEpicFolderName(epic) {
    const key = epic.key;
    const title = this._sanitizeTitle(epic.summary).substring(0, 50);
    return `${key}_${title}`;
  }

  _formatAcceptanceCriteria(issue) {
    if (issue.acceptanceCriteria) {
      const ac = issue.acceptanceCriteria;
      if (typeof ac === 'string') return ac;
      if (Array.isArray(ac)) return ac.map((item, i) => `${i + 1}. ${item}`).join('\n');
      if (typeof ac === 'object' && ac.content) {
        return JSON.stringify(ac);
      }
      return String(ac);
    }

    if (issue.description) {
      const lines = issue.description.split('\n');
      const acLines = [];
      let inAC = false;
      const endMarkers = [/^business\s*rules/i, /^technical\s*notes/i, /^notes/i];
      for (const line of lines) {
        const trimmed = line.trim();
        if (/acceptance\s*criteria/i.test(trimmed)) {
          inAC = true;
          continue;
        }
        if (inAC) {
          if (endMarkers.some((m) => m.test(trimmed))) break;
          if (trimmed) acLines.push(trimmed);
        }
      }
      if (acLines.length > 0) return acLines.join('\n\n');
    }

    return null;
  }

  hasAcceptanceCriteria(issue) {
    if (issue.acceptanceCriteria) return true;
    if (issue.description && /acceptance\s*criteria/i.test(issue.description)) return true;
    return false;
  }

  _extractBusinessRules(issue) {
    if (issue.businessRules) {
      const br = issue.businessRules;
      if (typeof br === 'string') return br;
      if (Array.isArray(br)) return br.map((item, i) => `${i + 1}. ${item}`).join('\n');
      return String(br);
    }
    return null;
  }

  hasBusinessRules(issue) {
    return !!issue.businessRules;
  }

  isTestRelated(issue) {
    const type = issue.issueType.toLowerCase();
    if (type === 'test' || type.includes('test')) return true;
    const labels = issue.labels || [];
    if (labels.some((l) => l.toLowerCase().includes('test'))) return true;
    const summary = (issue.summary || '').toLowerCase();
    if (/test(ing| case| plan)?/.test(summary)) return true;
    return false;
  }

  isAPIRelated(issue) {
    const type = issue.issueType.toLowerCase();
    if (type === 'api' || type.includes('api')) return true;
    const labels = issue.labels || [];
    if (labels.some((l) => l.toLowerCase().includes('api'))) return true;
    const summary = (issue.summary || '').toLowerCase();
    if (/^api\b|\bapi\b/.test(summary)) return true;
    return false;
  }

  hasScreenAttachments(issue) {
    const atts = issue.attachments || [];
    const imageMimes = ['image/png', 'image/jpeg', 'image/gif', 'image/svg+xml', 'image/webp', 'image/bmp'];
    return atts.some((a) => imageMimes.includes(a.mimeType));
  }

  _formatField(label, value) {
    if (value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) {
      return '';
    }
    return `| ${label} | ${value} |\n`;
  }

  _generateFrontMatter(issue) {
    return [
      '---',
      `jira-key: ${issue.key}`,
      `issue-type: ${issue.issueType}`,
      `status: ${issue.status}`,
      `updated: ${this._formatDate(issue.updated)}`,
      '---',
    ].join('\n');
  }

  _generateMetadataTable(issue) {
    const rows = [];

    rows.push(this._formatField('Status', issue.status));
    rows.push(this._formatField('Priority', issue.priority));
    rows.push(this._formatField('Assignee', issue.assignee));
    rows.push(this._formatField('Reporter', issue.reporter));
    if (issue.storyPoints !== null && issue.storyPoints !== undefined) {
      rows.push(this._formatField('Story Points', issue.storyPoints));
    }
    if (issue.sprint) {
      const sprintName = typeof issue.sprint === 'object' ? issue.sprint.name || JSON.stringify(issue.sprint) : issue.sprint;
      rows.push(this._formatField('Sprint', sprintName));
    }
    rows.push(this._formatField('Created', this._formatDate(issue.created)));
    rows.push(this._formatField('Updated', this._formatDate(issue.updated)));
    if (issue.labels && issue.labels.length > 0) {
      rows.push(this._formatField('Labels', issue.labels.join(', ')));
    }

    return rows.join('');
  }

  _generateLinksSection(issue, hierarchyInfo) {
    const lines = [];
    const hasHierarchy = hierarchyInfo && (hierarchyInfo.epic || hierarchyInfo.parentStory || hierarchyInfo.childIssues);

    if (hasHierarchy) {
      if (hierarchyInfo.epic) {
        const parentIsEpic = issue.parent && issue.parent.key === hierarchyInfo.epic.key;
        if (parentIsEpic) {
          lines.push(`### Parent Epic\n\n- **Key:** ${hierarchyInfo.epic.key}\n- **Summary:** ${hierarchyInfo.epic.summary}\n`);
        } else {
          lines.push(`### Epic\n\n- **Key:** ${hierarchyInfo.epic.key}\n- **Summary:** ${hierarchyInfo.epic.summary}\n`);
        }
      }
      if (hierarchyInfo.parentStory) {
        lines.push(`### Parent Story\n\n- **Key:** ${hierarchyInfo.parentStory.key}\n- **Summary:** ${hierarchyInfo.parentStory.summary}\n`);
      } else if (issue.parent) {
        const parentIsEpic = hierarchyInfo.epic && issue.parent.key === hierarchyInfo.epic.key;
        if (!parentIsEpic) {
          lines.push(`### Parent Issue\n\n- **Key:** ${issue.parent.key}\n- **Summary:** ${issue.parent.summary || 'N/A'}\n`);
        }
      }
      if (hierarchyInfo.childIssues && hierarchyInfo.childIssues.length > 0) {
        lines.push('### Child Issues\n\n');
        for (const child of hierarchyInfo.childIssues) {
          lines.push(`- **${child.key}:** ${child.summary || 'N/A'}`);
        }
        lines.push('\n');
      }
    } else {
      if (issue.parent) {
        lines.push(`### Parent Issue\n\n- **Key:** ${issue.parent.key}\n- **Summary:** ${issue.parent.summary || 'N/A'}\n`);
      }
      if (issue.epicLink) {
        lines.push(`### Epic\n\n- **Epic Link:** ${issue.epicLink}\n`);
      }
    }

    if (issue.linkedIssues && issue.linkedIssues.length > 0) {
      lines.push('### Linked Issues\n\n');
      for (const link of issue.linkedIssues) {
        lines.push(`- **${link.type}:** ${link.key} - ${link.summary || 'N/A'}`);
      }
      lines.push('\n');
    }

    return lines.join('');
  }

  _generateAttachmentsSection(issue) {
    if (!issue.attachments || issue.attachments.length === 0) return '';

    const lines = ['### Attachments\n\n'];
    for (const att of issue.attachments) {
      const sizeKB = (att.size / 1024).toFixed(1);
      lines.push(`- **${att.filename}** (${sizeKB} KB) - uploaded by ${att.author} on ${this._formatDate(att.created)}`);
    }
    lines.push('\n');

    return lines.join('');
  }

  _generateCommentsSection(issue) {
    if (!issue.comments || issue.comments.length === 0) return '';

    const lines = ['### Comments\n\n'];
    for (const comment of issue.comments) {
      lines.push(`**${comment.author}** - ${this._formatDate(comment.created)}`);
      lines.push('');
      lines.push(comment.body || '');
      lines.push('');
      lines.push('---');
      lines.push('');
    }

    return lines.join('\n');
  }

  generateIssueMarkdown(issue, hierarchyInfo) {
    const lines = [];

    lines.push(this._generateFrontMatter(issue));
    lines.push('');

    lines.push(`# ${issue.key}: ${issue.summary}`);
    lines.push('');
    lines.push(`**Issue Type:** ${issue.issueType}`);
    lines.push('');

    lines.push('## Metadata\n');
    lines.push('| Field | Value |');
    lines.push('|-------|-------|');
    lines.push(this._generateMetadataTable(issue));
    lines.push('');

    lines.push('## Description\n');
    lines.push(this._formatDescription(issue.description));
    lines.push('');
    lines.push('');

    const acceptanceCriteria = this._formatAcceptanceCriteria(issue);
    if (acceptanceCriteria) {
      lines.push('## Acceptance Criteria\n');
      lines.push(acceptanceCriteria);
      lines.push('');
      lines.push('');
    }

    const businessRules = this._extractBusinessRules(issue);
    if (businessRules) {
      lines.push('## Business Rules\n');
      lines.push(businessRules);
      lines.push('');
      lines.push('');
    }

    const linksSection = this._generateLinksSection(issue, hierarchyInfo);
    if (linksSection) {
      lines.push('## Links\n');
      lines.push(linksSection);
      lines.push('');
    }

    const attachmentsSection = this._generateAttachmentsSection(issue);
    if (attachmentsSection) {
      lines.push(attachmentsSection);
      lines.push('');
    }

    const commentsSection = this._generateCommentsSection(issue);
    if (commentsSection) {
      lines.push(commentsSection);
    }

    lines.push('');
    lines.push(`_Last updated: ${this._formatDate(issue.updated)}_`);
    lines.push('');

    return lines.join('\n');
  }

  generateAcceptanceCriteriaDoc(issue) {
    const acContent = this._formatAcceptanceCriteria(issue);
    if (!acContent) return null;

    const lines = [];
    lines.push('---');
    lines.push(`jira-key: ${issue.key}`);
    lines.push(`source-type: ${issue.issueType}`);
    lines.push(`source-summary: ${issue.summary}`);
    lines.push(`status: ${issue.status}`);
    lines.push(`updated: ${this._formatDate(issue.updated)}`);
    lines.push('---');
    lines.push('');
    lines.push(`# Acceptance Criteria: ${issue.key}`);
    lines.push('');
    lines.push(`**Source:** ${issue.key} - ${issue.summary}`);
    lines.push(`**Issue Type:** ${issue.issueType}`);
    lines.push('');
    lines.push('## Criteria\n');
    lines.push(acContent);
    lines.push('');
    lines.push('---');
    lines.push(`_Last updated: ${this._formatDate(issue.updated)}_`);
    lines.push('');

    return lines.join('\n');
  }

  generateBusinessRulesDoc(issue) {
    const brContent = this._extractBusinessRules(issue);
    if (!brContent) return null;

    const lines = [];
    lines.push('---');
    lines.push(`jira-key: ${issue.key}`);
    lines.push(`source-type: ${issue.issueType}`);
    lines.push(`source-summary: ${issue.summary}`);
    lines.push(`status: ${issue.status}`);
    lines.push(`updated: ${this._formatDate(issue.updated)}`);
    lines.push('---');
    lines.push('');
    lines.push(`# Business Rules: ${issue.key}`);
    lines.push('');
    lines.push(`**Source:** ${issue.key} - ${issue.summary}`);
    lines.push(`**Issue Type:** ${issue.issueType}`);
    lines.push('');
    lines.push('## Rules\n');
    lines.push(brContent);
    lines.push('');
    lines.push('---');
    lines.push(`_Last updated: ${this._formatDate(issue.updated)}_`);
    lines.push('');

    return lines.join('\n');
  }

  getAcceptanceCriteriaFileName(issue) {
    return `AC-${issue.key}.md`;
  }

  getBusinessRulesFileName(issue) {
    return `BR-${issue.key}.md`;
  }

  getAPIDocFileName(issue) {
    return `API-${issue.key}.md`;
  }

  getTestCaseFileName(issue) {
    return `TC-${issue.key}.md`;
  }

  getScreenFileName(issue) {
    return `SCREEN-${issue.key}.md`;
  }

  generateFolderReadme(folderName, description) {
    const folderTitles = {
      '03_Epics': 'Epics',
      '04_Features': 'Features',
      '05_User_Stories': 'User Stories',
      '06_Screens': 'Screens',
      '07_Acceptance_Criteria': 'Acceptance Criteria',
      '08_Business_Rules': 'Business Rules',
      '09_API_Documentation': 'API Documentation',
      '10_Test_Cases': 'Test Cases',
    };

    const title = folderTitles[folderName] || folderName;

    return [
      `# ${title}`,
      '',
      description,
      '',
      '_This folder is auto-generated by the Jira sync utility. Do not edit manually._',
      '',
      `Last synced: ${this._formatDate(new Date().toISOString())}`,
      '',
    ].join('\n');
  }

  generateEpicFolderReadme(epic) {
    return [
      `# ${epic.key}: ${epic.summary}`,
      '',
      `**Status:** ${epic.status} | **Priority:** ${epic.priority} | **Assignee:** ${epic.assignee}`,
      '',
      this._formatDescription(epic.description),
      '',
      '---',
      '',
      '_This folder is auto-generated by the Jira sync utility. Do not edit manually._',
      '',
      `Last synced: ${this._formatDate(new Date().toISOString())}`,
      '',
    ].join('\n');
  }

  generateSummaryReport(stats) {
    const lines = [];

    lines.push('# Jira Sync Summary');
    lines.push('');
    lines.push(`**Sync Time:** ${this._formatDate(new Date().toISOString())}`);
    lines.push('');
    lines.push('## Statistics\n');
    lines.push('| Category | Count |');
    lines.push('|----------|-------|');

    for (const [key, value] of Object.entries(stats.fetched)) {
      if (value > 0) {
        lines.push(`| ${key} Fetched | ${value} |`);
      }
    }

    lines.push('');
    lines.push('| Action | Count |');
    lines.push('|--------|-------|');
    for (const [key, value] of Object.entries(stats.generated)) {
      if (value > 0) {
        lines.push(`| ${key} Generated | ${value} |`);
      }
    }

    lines.push('');
    lines.push('## Folders Updated\n');
    for (const folder of stats.foldersUpdated) {
      lines.push(`- \`docs/${folder}/\``);
    }
    lines.push('');

    if (stats.errors.length > 0) {
      lines.push('## Errors\n');
      for (const err of stats.errors) {
        lines.push(`- ${err}`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }
}

module.exports = MarkdownGenerator;
