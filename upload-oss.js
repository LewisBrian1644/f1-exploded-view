// Upload f1-exploded-view to Aliyun OSS bucket
const OSS = require('ali-oss');
const fs = require('fs');
const path = require('path');

const AK_ID = process.env.OSS_AK_ID;
const AK_SECRET = process.env.OSS_AK_SECRET;

if (!AK_ID || !AK_SECRET) {
  console.error('请先设置环境变量:');
  console.error('  set OSS_AK_ID=你的AccessKeyID');
  console.error('  set OSS_AK_SECRET=你的AccessKeySecret');
  process.exit(1);
}

const client = new OSS({
  region: 'oss-cn-hangzhou',
  accessKeyId: AK_ID,
  accessKeySecret: AK_SECRET,
  bucket: 'f1-exploded-view',
});

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.gltf': 'model/gltf+json',
  '.bin': 'application/octet-stream',
  '.png': 'image/png',
  '.txt': 'text/plain',
};

async function uploadFile(localPath, ossPath) {
  const ext = path.extname(localPath).toLowerCase();
  const mime = MIME[ext] || 'application/octet-stream';
  const headers = {};
  if (ext === '.html') {
    headers['Cache-Control'] = 'no-cache';
  } else {
    headers['Cache-Control'] = 'public, max-age=86400';
  }

  try {
    // Use `mime` option to properly set Content-Type for static website hosting
    const result = await client.put(ossPath, localPath, { mime, headers });
    console.log(`✓ ${ossPath}`);
  } catch (err) {
    console.error(`✗ ${ossPath}: ${err.message}`);
  }
}

async function uploadDir(localDir, ossPrefix) {
  const files = fs.readdirSync(localDir);
  for (const f of files) {
    const fp = path.join(localDir, f);
    if (fs.statSync(fp).isFile()) {
      await uploadFile(fp, ossPrefix + f);
    }
  }
}

async function main() {
  console.log('开始上传...\n');

  // Root files (excluding node_modules, .git, etc.)
  await uploadFile('f1.html', 'f1.html');

  // Model files
  await uploadFile('model/scene.gltf', 'model/scene.gltf');
  await uploadFile('model/scene.bin', 'model/scene.bin');
  await uploadFile('model/license.txt', 'model/license.txt');

  // Textures
  await uploadDir('model/textures/', 'model/textures/');

  console.log('\n上传完成!');
  console.log('访问地址: https://f1-exploded-view.oss-cn-hangzhou.aliyuncs.com/f1.html');
}

main().catch(err => {
  console.error('上传失败:', err.message);
  process.exit(1);
});
