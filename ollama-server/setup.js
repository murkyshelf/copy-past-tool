const { exec } = require('child_process');
const { promisify } = require('util');
const axios = require('axios');

const execAsync = promisify(exec);

async function setupOllama() {
  console.log('🚀 Setting up Ollama for AI Code Clipboard...\n');

  try {
    // Check if Ollama is installed
    console.log('📋 Checking Ollama installation...');
    await execAsync('ollama --version');
    console.log('✅ Ollama is installed\n');
  } catch (error) {
    console.log('❌ Ollama is not installed. Please install it first:');
    console.log('Linux: curl -fsSL https://ollama.ai/install.sh | sh');
    console.log('macOS: brew install ollama');
    console.log('Windows: Download from https://ollama.ai/download\n');
    return;
  }

  try {
    // Check if Ollama service is running
    console.log('🔍 Checking if Ollama service is running...');
    await axios.get('http://localhost:11434/api/tags', { timeout: 5000 });
    console.log('✅ Ollama service is running\n');
  } catch (error) {
    console.log('⚠️  Ollama service is not running. Starting it...');
    console.log('Run: ollama serve\n');
    
    // Try to start Ollama service (on some systems)
    try {
      exec('ollama serve', (error, stdout, stderr) => {
        if (error) {
          console.log('Please manually start Ollama service: ollama serve');
        }
      });
      
      // Wait a bit for service to start
      await new Promise(resolve => setTimeout(resolve, 3000));
    } catch (e) {
      console.log('Please manually start Ollama service: ollama serve');
    }
  }

  // Install recommended models
  const modelsToInstall = [
    'qwen2.5-coder:7b',
    'codellama:7b'
  ];

  for (const model of modelsToInstall) {
    try {
      console.log(`📦 Installing model: ${model}...`);
      console.log('This may take a while for the first installation...');
      
      const { stdout, stderr } = await execAsync(`ollama pull ${model}`);
      console.log(`✅ Model ${model} installed successfully`);
      
      if (stderr) {
        console.log(`Warning: ${stderr}`);
      }
    } catch (error) {
      console.log(`❌ Failed to install ${model}: ${error.message}`);
      console.log('You can install it manually later with: ollama pull ' + model);
    }
    console.log('');
  }

  console.log('🎉 Setup complete!');
  console.log('\nNext steps:');
  console.log('1. Make sure Ollama service is running: ollama serve');
  console.log('2. Start this server: npm start');
  console.log('3. Deploy the Render server');
  console.log('4. Install the Chrome extension');
  console.log('5. Configure the extension with your Render server URL\n');
}

// Run setup if this file is executed directly
if (require.main === module) {
  setupOllama().catch(console.error);
}

module.exports = { setupOllama };
