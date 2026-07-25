# F1 爆炸视图 - Formula 1 Exploded View

基于 Three.js 的 F1 赛车 3D 爆炸视图，支持部件分解、分类筛选、交互式 3D 探索。

## 车型
- 2026 Aston Martin AMR26 (Sketchfab 高精度 3D 扫描模型)

## 功能
- 🏎️ 真实 glTF 3D 模型加载（175+ 独立命名部件）
- 💥 爆炸视图动画（滑块控制分解程度）
- 🏷️ 按系统分类筛选（底盘、动力单元、空力、悬挂等）
- 👆 点击部件查看技术详情
- 🌓 深色/浅色主题切换
- 📱 响应式布局（桌面/平板/手机）
- ⌨️ 键盘快捷键

## 运行
```bash
# 需要本地HTTP服务器（glTF模型需通过HTTP加载）
npx serve .
# 或
python -m http.server 8080
```
然后访问 http://localhost:8080/f1.html

## 技术栈
- Three.js 0.160 (WebGL 3D渲染)
- GLTFLoader (glTF 2.0 模型加载)
- OrbitControls (相机控制)
- 纯 HTML/CSS/JS (无框架)

