# 重建说明

`build-kit.py` 用 fontTools 将 Noto Sans SC 转曲，生成 SVG 母版、黑白配色和主视觉。`export-raster.py` 使用已安装的 logo-design 渲染透明 PNG 和 Windows ICO。`build-presentation.py` 使用该技能生成六个黑白应用场景，并替换未确认的真实域名为 `sapere.example`。`validate-kit.py` 检查图形、PNG、ICO 和对比度。

需要 Python 3、fontTools、Pillow，以及 logo-design 的 SVG 渲染工具。fontTools 可放在独立目录，向脚本传入 `--fonttools-dir`，无需修改项目 Node 依赖。

字体来源：Google Fonts 官方仓库 [Noto Sans SC](https://github.com/google/fonts/blob/main/ofl/notosanssc/NotoSansSC%5Bwght%5D.ttf)，英文使用 wght=600，中文 wght=500。套件附 OFL 许可，原始字体不再分发。技能来源：https://github.com/kaankiziltug/logo-design-skill 。

运行 `build-kit.py --font-dir <字体目录> --fonttools-dir <fontTools目录>`，字体目录需含 `NotoSansSC.ttf` 及 `NotoSansSC-OFL.txt`。随后运行 `export-raster.py --skill-dir <logo-design目录>` 与 `build-presentation.py --skill-dir <logo-design目录>`。

Web 图标使用技能 `export_variants.py`：主色 `#151918`，前景 `#FFFFFF`，icon-scale=0.65，以 `svg/sapere-symbol-small.svg` 作为 favicon-source。不要保留旧绿色导出文件。

PNG 生成后运行 `validate-kit.py`。使用技能 `render_png.py` 将 `presentation/sapere-identity.svg` 渲染为 1600×1120 PNG。展示中 `#151918` 保持第二轮原值，需要纯灰阶输出时选 `-black` 母版。
