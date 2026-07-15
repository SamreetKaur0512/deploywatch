const cron = require('node-cron');
const Project = require('../models/Project');
const { checkProjectStatus } = require('../controllers/projectController');

let io = null;

const initCronJobs = (socketIo) => {
  io = socketIo;

  // Ping all projects every 10 minutes
  cron.schedule('*/10 * * * *', async () => {
    console.log('⏰ [CRON] Running project status check...');
    try {
      const projects = await Project.find({ trackingEnabled: true });
      console.log(`🔍 Checking ${projects.length} projects...`);

      for (const project of projects) {
        try {
          await checkProjectStatus(project, io);
        } catch (err) {
          console.error(`❌ Error checking ${project.name}:`, err.message);
        }
      }

      console.log('✅ [CRON] Status check complete.');
    } catch (error) {
      console.error('❌ [CRON] Failed:', error.message);
    }
  });

  console.log('✅ Cron jobs initialized (every 10 min)');
};

module.exports = { initCronJobs };
