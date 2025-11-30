const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const projectRoot = __dirname;
const autolinkingJsonPath = path.join(
  projectRoot,
  'android',
  'build',
  'generated',
  'autolinking',
  'autolinking.json',
);
const autolinkingDir = path.dirname(autolinkingJsonPath);

// Ensure directory exists
if (!fs.existsSync(autolinkingDir)) {
  fs.mkdirSync(autolinkingDir, { recursive: true });
}

try {
  // Use React Native CLI to generate the full config
  // The Gradle plugin expects the full React Native config format, not just packages
  console.log('Generating React Native config for autolinking...');
  const configOutput = execSync('npx react-native config', {
    encoding: 'utf8',
    cwd: projectRoot,
    stdio: 'pipe',
  });

  // Parse the JSON output
  const config = JSON.parse(configOutput);

  // Write the full config (Gradle plugin expects this format)
  const buffer = Buffer.from(JSON.stringify(config, null, 2), 'utf8');
  fs.writeFileSync(autolinkingJsonPath, buffer, {
    encoding: 'utf8',
    flag: 'w',
  });

  console.log(`Generated autolinking.json with full React Native config`);
  if (config.dependencies) {
    const androidDeps = Object.values(config.dependencies).filter(
      dep => dep.platforms?.android,
    );
    console.log(`Found ${androidDeps.length} Android dependencies`);
  }
} catch (error) {
  console.error('Error generating autolinking.json:', error.message);
  // Fallback: create empty config structure
  const fallbackConfig = {
    dependencies: {},
    project: {
      android: {
        packageName: 'com.converso',
      },
    },
  };
  const buffer = Buffer.from(JSON.stringify(fallbackConfig, null, 2), 'utf8');
  fs.writeFileSync(autolinkingJsonPath, buffer, {
    encoding: 'utf8',
    flag: 'w',
  });
  console.log('Created fallback autolinking.json');
}
