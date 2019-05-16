import { cwd } from 'process';
import { readFileSync } from 'fs';

export function capitalize(str) {
  return `${str.charAt(0).toUpperCase()}${str.slice(1)}`;
}

export function formatText(str) {
  return str
    .replace(/[/\\\-_+]/g, ' ')
    .split(' ')
    .map(word => capitalize(word))
    .join(' ');
}

export function handleGetConfig() {
  try {
    return JSON.parse(readFileSync(`${cwd()}/minder.config.json`));
  } catch (ignore) {
    return {};
  }
}

export function handlePlugin(data, config) {
  let plugin;
  try {
    // eslint-disable-next-line global-require,import/no-unresolved
    plugin = require(`${cwd()}/minder-plugin.js`);
  } catch (_) {
    plugin = () => {};
  }

  plugin(data, config);
}

export function returnVulnDataFromResponse(packageManager, response) {
  switch (packageManager) {
    case 'yarn':
      const resArray = response.split(/\n/).filter(line => line !== '');
      return JSON.parse(resArray[resArray.length - 1]).data.vulnerabilities;
    default:
      return JSON.parse(response).metadata.vulnerabilities;
  }
}

export function filterOutWhiteListedAdvisories(
  packageManager,
  response,
  whitelistedAdvisories
) {
  switch (packageManager) {
    case 'yarn':
      const resArray = response.replace(/\}\n\{/g, '}}--{{').split(/}--{/g);
      return resArray
        .map(item =>
          JSON.parse(
            item
              .replace(/[\n+\`+]/g, '')
              .replace(/'/g, "'")
              .replace(/(")(\d+)(")/, '$2')
          )
        )
        .filter(item => item.type === 'auditAdvisory')
        .filter(
          advisory =>
            !whitelistedAdvisories.includes(String(advisory.data.advisory.id))
        );
    default:
      const json = JSON.parse(response);
      const { advisories } = json;
      const filteredAdvisories = Object.keys(advisories).reduce(
        (acc, advisory) => {
          if (whitelistedAdvisories.includes(advisory)) {
            return {};
          }
          return {
            ...acc,
            [advisory]: advisories[advisory]
          };
        },
        {}
      );
      return {
        ...json,
        advisories: filteredAdvisories
      };
  }
}
