// Pinbranch pm2 进程守护配置
// 首次使用: pm2 start ecosystem.config.cjs --env production && pm2 save
// 之后部署脚本 deploy.sh 会自动 startOrRestart
module.exports = {
  apps: [
    {
      name: 'pinbranch',
      cwd: __dirname,
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,            // 崩溃自动重启
      max_memory_restart: '512M',   // 超过 512M 自动重启
      out_file: '.pm2-out.log',
      error_file: '.pm2-error.log',
      time: true,
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    }
  ]
};
