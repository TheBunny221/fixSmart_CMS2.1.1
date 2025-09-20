const path = require('path');

const logDir = path.join(__dirname, 'logs', 'prod');

module.exports = {
  apps: [
    {
      name: 'cochin-api',
      script: 'server/server.js',
      exec_mode: 'cluster',
      instances: 4,
      watch: false,
      autorestart: true,
      max_memory_restart: '600M',
      env: {
        NODE_ENV: 'production',
      },
      out_file: path.join(logDir, 'api-out.log'),
      error_file: path.join(logDir, 'api-error.log'),
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
};
