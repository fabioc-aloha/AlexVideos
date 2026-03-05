# generate-3d.js

![3D Generation](../assets/banner-3d.png)

3D model generation from text prompts and images via Replicate. 6 models producing meshes in GLB, OBJ, PLY, and STL formats.

## Quick Start

```bash
# Default (Trellis)
node generate-3d.js "a medieval sword"

# From image
node generate-3d.js --model trellis --image ./sword.png

# Rodin with quality setting
node generate-3d.js "a cute robot" --model rodin --quality high --material PBR

# Hunyuan3D multi-view
node generate-3d.js --model hunyuan --image ./toy.jpg --faces 40000

# ShapeE (fast, lightweight)
node generate-3d.js "a chair" --model shape --guidance 15

# 3D Printing — native STL from Rodin
node generate-3d.js "a gear wheel" --model rodin --stl --meshmode Triangle

# 3D Printing — convert TRELLIS GLB to STL
node generate-3d.js --model trellis --image ./figurine.png --stl
```

## CLI Options

| Option | Description | Default |
| -------- | ------------- | --------- |
| `--model <name>` | 3D model to use | `trellis` |
| `--image <path>` | Input image for image-to-3D | — |
| `--seed <n>` | Random seed | — |
| `--format <str>` | Output format (glb, obj, ply, stl) | — |
| `--faces <n>` | Target face count for mesh | — |
| `--quality <str>` | Quality level (low, medium, high, extra-high) | — |
| `--material <str>` | Material type (PBR, Shaded) | — |
| `--meshmode <str>` | Mesh face type: `Quad` or `Raw` (Rodin only) | — |
| `--tpose` | Generate in T-pose (for characters) | — |
| `--preview` | Generate preview image | — |
| `--steps <n>` | Diffusion steps | — |
| `--guidance <n>` | Guidance scale | — |
| `--texture <str>` | Texture resolution/type | — |
| `--simplify <n>` | Mesh simplification ratio | — |
| `--color <path>` | Color map input | — |
| `--normal <path>` | Normal map input | — |
| `--ply` | Output PLY format | — |
| `--nobg` | Remove background from input image | — |
| `--chunks <n>` | Processing chunks | — |
| `--octree <n>` | Octree resolution | — |
| `--speedmode <str>` | Speed/quality tradeoff | — |
| `--negative <str>` | Negative prompt | — |
| `--maxsteps <n>` | Maximum generation steps | — |
| `--mesh <str>` | Mesh type/quality | — |
| `--rendermode <str>` | Render mode for preview | — |
| `--rendersize <n>` | Render resolution | — |
| `--count <n>` | Number of outputs | — |
| `--bbox <str>` | Bounding box constraints | — |
| `--addons <str>` | Additional features | — |
| `--front <path>` | Front view image (multi-view) | — |
| `--back <path>` | Back view image (multi-view) | — |
| `--left <path>` | Left view image (multi-view) | — |
| `--right <path>` | Right view image (multi-view) | — |
| `--stl` | Convert output to STL (3D printer format) | — |

## Models

| Key | Replicate ID | Name | Cost | Native STL |
| ----- | ------------- | ------ | ------ | :----------: |
| `trellis` | `firtoz/trellis` | TRELLIS | per-second GPU | — (GLB→STL) |
| `rodin` | `hyper3d/rodin` | Rodin Gen-2 | $0.40/output | ✅ |
| `hunyuan` | `prunaai/hunyuan3d-2` | Hunyuan3D-2 | per-second GPU | — (GLB→STL) |
| `hunyuan2mv` | `tencent/hunyuan3d-2mv` | Hunyuan3D-2mv | per-second GPU | ✅ |
| `mvdream` | `adirik/mvdream` | MVDream | per-second GPU | — |
| `shape` | `cjwbw/shap-e` | Shap-E (OpenAI) | per-second GPU | — |

## Parameter Support Matrix

| Model | prompt | image | seed | format | faces | quality | material | steps | guidance | multi-view |
| ------- | :------: | :-----: | :----: | :------: | :-----: | :-------: | :--------: | :-----: | :--------: | :----------: |
| `trellis` | ✅ | ✅ | ✅ | ✅ (glb) | — | — | — | ✅ | — | — |
| `rodin` | ✅ | ✅ | — | ✅ (glb,obj,stl,fbx,usdz) | ✅ | ✅ | ✅ | — | — | ✅ |
| `hunyuan` | — | ✅ | ✅ | ✅ (glb,obj) | ✅ | — | — | ✅ | — | — |
| `hunyuan2mv` | — | ✅ | ✅ | ✅ (glb,obj,ply,stl) | ✅ | — | — | ✅ | ✅ | ✅ |
| `mvdream` | ✅ | — | ✅ | — | — | — | — | ✅ | ✅ | — |
| `shape` | ✅ | ✅ | — | — | — | — | — | — | ✅ | — |

## Notes

- **Default model**: `trellis` (TRELLIS — best all-around image-to-3D)
- **Image-to-3D**: Most models accept `--image` for reconstructing 3D from photos
- **Multi-view**: `rodin` and `hunyuan2mv` support `--front`, `--back`, `--left`, `--right` reference images
- **Rodin**: Most feature-rich with quality levels, PBR materials, T-pose, and face count control
- **Shap-E**: Fastest/cheapest but lowest quality; good for prototyping
- **Hunyuan3D**: Good balance of quality and speed with diffusion controls
- Output saved to `./media/` as 3D model file + JSON report

## 3D Printing

Use `--stl` to get STL output suitable for 3D printers (PrusaSlicer, Cura, BambuStudio, etc.).

### Native STL Models

These models request STL directly from the Replicate API (no conversion needed):

```bash
# Rodin — supports glb, obj, stl, fbx, usdz
node generate-3d.js "a gear wheel" --model rodin --stl --quality high --meshmode Triangle

# Hunyuan2mv — supports glb, obj, ply, stl
node generate-3d.js --model hunyuan2mv --front ./front.png --back ./back.png --stl
```

### Converted STL (GLB → STL)

TRELLIS and Hunyuan output GLB by default. `--stl` auto-converts using `@gltf-transform/core`:

```bash
# TRELLIS — GLB output auto-converted to STL
node generate-3d.js --model trellis --image ./figurine.png --stl

# Hunyuan — GLB output auto-converted to STL
node generate-3d.js --model hunyuan --image ./toy.jpg --stl --faces 40000
```

### Tips for 3D Printing

- Use `--faces` to control polygon count (lower = faster slicing, less detail)
- Use `--meshmode Triangle` with Rodin for slicer-ready triangulated meshes
- STL files lose texture/color data — they contain geometry only
- OBJ is also accepted by most modern slicers
