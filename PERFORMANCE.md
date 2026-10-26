# Homepage rendering

The original hero used Canvas 2D with 32 shadow-blurred, gradient strokes and 16 newly
constructed radial gradients on every animation frame. Its backing store could reach
four times the CSS pixel count on a high-density screen. Software rasterization could
consume an entire main thread.

The hero now uses hardware WebGL when available. All dust, edges and vertex halos are
triangles in one reusable buffer and one draw call. A small fragment shader supplies
the line glow, round caps and vertex halos without blur passes. The preferred adapter
is the low-power GPU. Context creation rejects major performance caveats so software
WebGL falls back to Canvas. A shader failure or lost context also falls back to Canvas.

The Canvas path caches vertex halos, groups dust fills, and draws line glow with wider
translucent strokes instead of shadow blur. It keeps the rotating geometry, endpoint
colors and pointer interaction; the glow is an approximation rather than an exact
pixel match to the old Gaussian blur.

Both paths reuse projection storage, compute rotation trigonometry once per frame,
and stop their animation callback when hidden, offscreen or reduced motion is enabled.
Reduced motion still renders a static scene and responds to theme/size changes.
Rendering is capped at 60 draws per second on high-refresh screens. The GPU backing
store is bounded to approximately three million pixels and DPR 2, the CPU backing
store to one million pixels and DPR 1. Sustained missed frames lower resolution further.
These are rendering budgets, not physical constants or guarantees of device speed.

The status pulse now animates transform and opacity instead of repainting box shadows.
Offscreen/hidden CSS and SVG animations pause. Demo videos play only when at least 35%
visible, pause when the tab is hidden, and follow reduced-motion changes without reload.

## Measurements

Local headless Chromium 141, Linux, 1440×900 CSS viewport at device scale factor 2,
dark theme, four-second sample following warmup, 2026-10-25. Original assets came from
`6eab62a16d517fd7f399a42325a374713208fa00` and the original hero matched the live site's
JavaScript at inspection. The HTML and media were held constant between versions.

| Browser rendering mode | Original fps | Updated fps | Original main-thread ms/s | Updated main-thread ms/s |
|---|---:|---:|---:|---:|
| All GPU rendering disabled | 36.4 | 59.8 | 998.1 | 324.1 |
| Intel integrated GPU, ANGLE OpenGL | 47.8 | 60.0 | 120.5 | 54.1 |
| NVIDIA RTX 3050 laptop GPU, ANGLE Vulkan | 59.1 | 59.8 | 77.6 | 51.0 |

Main-thread work fell by 68%, 55% and 34% respectively in these samples. The discrete
GPU was already close to 60 fps: it gained little frame rate. Browser TaskDuration
includes main-thread work; it does not measure all GPU/renderer-process CPU work or
power consumption. These are single local samples, not a cross-device performance
guarantee. Mobile viewport tests emulate layout and pixel density, not mobile hardware.

The numerical projection check compares all 16 uploaded vertex centers with an
independent implementation of the original rotations and perspective at t=1.2.
The desktop maximum error was 0.0000454 CSS pixels (Float32 upload rounding), below
the fixed 0.001-pixel tolerance. Glow is checked visually, not certified pixel-identical.

## Reproduce

The browser tool is a development dependency; the deployed site remains buildless.

```sh
python3 -m pip install playwright
python3 -m playwright install chromium
python3 tools/check_site.py
python3 tools/test_home.py --cpu --benchmark --baseline-ref 6eab62a
# Linux hardware acceleration in a headless browser, when supported by its driver:
python3 tools/test_home.py --gpu-angle gl --benchmark --baseline-ref 6eab62a
python3 tools/test_home.py --gpu-angle vulkan --benchmark --baseline-ref 6eab62a
```

Use `--executable /path/to/chrome` to select another installed Chromium. The opt-in
ANGLE/blocklist flags are test-harness options; the website uses ordinary browser
capability detection and never changes browser settings. Hardware GPU tests should
report `webgl`; a `2d` result means they exercised the fallback instead.

Browser checks use the production homepage CSP and cover animation, offscreen/hidden
pause and resume, actual video playback, theme switching, runtime reduced-motion
changes, mobile/4K canvas bounds, 60/90/120/144/240 Hz scheduling, and, when hardware
WebGL is available, shader failure, context loss and mathematical projection.
The visibility-event check simulates document visibility; it does not test OS-level
tab scheduling. Physical mobile devices and Safari/Firefox still need separate checks.

The rendering choices follow the browser guidance to
[batch WebGL draws and bound backing-store size](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices)
and [cache Canvas work and avoid shadow blur](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas).
