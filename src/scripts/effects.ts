/*! Visual adaptations of React Bits. Light ray strength adapted from LightRays.
 * Copyright (c) 2026 David Haz; MIT + Commons Clause.
 * License: /react-bits-license.txt; source: src/vendor/react-bits/LICENSE.md. */
type RenderEffect = {
  draw: (time: number) => boolean | void;
  resize: () => void;
  dispose: () => void;
  pointer?: (x: number, y: number, click: boolean) => void;
};

function lightRays(canvas: HTMLCanvasElement): RenderEffect | null {
  const gl = canvas.getContext("webgl", {
    alpha: true,
    premultipliedAlpha: false,
    antialias: false,
    powerPreference: "low-power",
  });
  if (!gl) return null;
  const vertex = `attribute vec2 position; void main(){gl_Position=vec4(position,0.,1.);}`;
  const fragment = `precision mediump float;
    uniform vec2 resolution; uniform float time; uniform vec2 pointer;
    float ray(vec2 source,vec2 direction,vec2 coord,float a,float b){
      vec2 delta=coord-source;
      float angle=dot(normalize(delta),direction);
      float spread=pow(max(angle,0.),7.);
      float falloff=clamp(1.-length(delta)/(resolution.x*1.65),0.,1.);
      float bands=clamp((.45+.15*sin(angle*a+time*.48))+(.3+.2*cos(-angle*b+time*.32)),0.,1.);
      return bands*spread*falloff;
    }
    void main(){
      vec2 coord=vec2(gl_FragCoord.x,resolution.y-gl_FragCoord.y);
      float sweep=.5-.5*cos(time*.30);
      vec2 source=vec2(resolution.x*.12,-resolution.y*.3);
      vec2 direction=normalize(vec2(mix(-.30,1.10,sweep)+pointer.x*.07,1.));
      float a=ray(source,direction,coord,76.2214,51.11349);
      float b=ray(source,direction,coord,52.3991,38.0234);
      float glow=(a*.55+b*.35)*.64;
      float edge=1.-smoothstep(.58,1.,coord.y/resolution.y);
      gl_FragColor=vec4(vec3(.40,.85,.69),glow*edge);
    }`;
  const compile = (type: number, source: string) => {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  };
  const vert = compile(gl.VERTEX_SHADER, vertex);
  const frag = compile(gl.FRAGMENT_SHADER, fragment);
  const program = gl.createProgram();
  if (!vert || !frag || !program) {
    if (vert) gl.deleteShader(vert);
    if (frag) gl.deleteShader(frag);
    if (program) gl.deleteProgram(program);
    return null;
  }
  gl.attachShader(program, vert);
  gl.attachShader(program, frag);
  gl.linkProgram(program);
  gl.deleteShader(vert);
  gl.deleteShader(frag);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return null;
  }
  gl.useProgram(program);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 3, -1, -1, 3]),
    gl.STATIC_DRAW,
  );
  const position = gl.getAttribLocation(program, "position");
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  const resolution = gl.getUniformLocation(program, "resolution");
  const time = gl.getUniformLocation(program, "time");
  const pointer = gl.getUniformLocation(program, "pointer");
  return {
    draw: (t) => {
      if (gl.isContextLost()) return false;
      gl.uniform1f(time, t / 1000);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    resize: () => {
      const dpr = Math.min(devicePixelRatio, 1.25);
      canvas.width = Math.round(canvas.clientWidth * dpr);
      canvas.height = Math.round(canvas.clientHeight * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(resolution, canvas.width, canvas.height);
    },
    pointer: (x, y) =>
      gl.uniform2f(
        pointer,
        x / canvas.clientWidth - 0.5,
        y / canvas.clientHeight - 0.5,
      ),
    dispose: () => {
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    },
  };
}

function canvasEffect(
  canvas: HTMLCanvasElement,
  grid: boolean,
): RenderEffect | null {
  const context = canvas.getContext("2d", { alpha: true });
  if (!context) return null;
  let w = 0,
    h = 0;
  let cursor = { x: -1000, y: -1000, time: -10000 };
  const pulses: { x: number; y: number; time: number }[] = [];
  return {
    resize: () => {
      const dpr = Math.min(devicePixelRatio, 1.25);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    },
    pointer: (x, y, click) => {
      cursor = { x, y, time: performance.now() };
      if (click) {
        pulses.push({ x, y, time: cursor.time });
        if (pulses.length > 3) pulses.shift();
      }
    },
    draw: (time) => {
      context.clearRect(0, 0, w, h);
      const gap = grid ? 58 : 22;
      while (pulses[0] && time - pulses[0].time > 2100) pulses.shift();
      const cursorFade = Math.max(0, 1 - (time - cursor.time) / 900);
      for (let y = 0; y < h; y += gap) {
        for (let x = 0; x < w; x += gap) {
          const distance = Math.hypot(x - cursor.x, y - cursor.y);
          let alpha = Math.max(0, 1 - distance / 190) ** 2 * cursorFade * 0.38;
          for (const pulse of pulses) {
            const age = (time - pulse.time) / 1000;
            const ring = Math.abs(
              Math.hypot(x - pulse.x, y - pulse.y) - age * 300,
            );
            alpha +=
              Math.max(0, 1 - ring / 55) * Math.max(0, 1 - age / 2.1) * 0.32;
          }
          if (grid) {
            if (alpha < 0.005) continue;
            context.strokeStyle = `rgba(142,234,195,${alpha})`;
            context.strokeRect(x + 0.5, y + 0.5, gap - 1, gap - 1);
            context.fillStyle = `rgba(142,234,195,${alpha * 0.09})`;
            context.fillRect(x, y, gap, gap);
          } else {
            const wave =
              Math.sin(x * 0.008 + time * 0.00018 + Math.sin(y * 0.006)) *
              Math.cos(y * 0.009 - time * 0.00013);
            const scatter = (Math.sin(x * 127.1 + y * 311.7) * 43758.5453) % 1;
            alpha += Math.max(0, wave - 0.05 + scatter * 0.38) * 0.16;
            if (alpha < 0.015) continue;
            context.fillStyle = `rgba(142,234,195,${Math.min(alpha, 0.38)})`;
            context.fillRect(
              x,
              y,
              2.5 + Math.max(0, wave) * 1.5,
              2.5 + Math.max(0, wave) * 1.5,
            );
          }
        }
      }
      // Cursor Grid sleeps completely after its trailing cells have faded.
      return !grid || cursorFade > 0 || pulses.length > 0;
    },
    dispose: () => context.clearRect(0, 0, w, h),
  };
}

export function initEffects() {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const touch = matchMedia("(hover: none), (pointer: coarse)");
  document.querySelectorAll<HTMLElement>("[data-effect]").forEach((host) => {
    if (host.dataset.initialized) return;
    host.dataset.initialized = "true";
    const canvas = host.querySelector("canvas");
    if (!canvas) return;
    let renderer: RenderEffect | null = null;
    let frame = 0;
    let visible = false;
    let lastFrame = 0;
    let lost = false;
    const allowed = () =>
      !reduced.matches &&
      !touch.matches &&
      !document.hidden &&
      visible &&
      !lost;
    const stop = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      host.dataset.running = "false";
    };
    const loop = (now: number) => {
      frame = 0;
      if (!allowed() || !renderer) {
        stop();
        return;
      }
      if (now - lastFrame >= 1000 / 30) {
        lastFrame = now;
        if (renderer.draw(now) === false) {
          stop();
          return;
        }
      }
      host.dataset.running = "true";
      frame = requestAnimationFrame(loop);
    };
    const wake = () => {
      if (!allowed()) {
        stop();
        return;
      }
      if (!renderer) {
        try {
          renderer =
            host.dataset.effect === "rays"
              ? lightRays(canvas)
              : canvasEffect(canvas, host.dataset.effect === "grid");
        } catch {
          renderer = null;
        }
        if (!renderer) {
          host.dataset.fallback = "true";
          return;
        }
        renderer.resize();
        host.dataset.ready = "true";
      }
      if (!frame) frame = requestAnimationFrame(loop);
    };
    const observer = new IntersectionObserver((entries) => {
      visible = entries.some((e) => e.isIntersecting);
      wake();
    });
    observer.observe(host);
    const resize = new ResizeObserver(() => {
      renderer?.resize();
      wake();
    });
    resize.observe(canvas);
    const pointer = (event: PointerEvent) => {
      if (!allowed() || !renderer || event.pointerType !== "mouse") return;
      const rect = canvas.getBoundingClientRect();
      renderer.pointer?.(
        event.clientX - rect.left,
        event.clientY - rect.top,
        event.type === "pointerdown",
      );
      wake();
    };
    window.addEventListener("pointermove", pointer, { passive: true });
    window.addEventListener("pointerdown", pointer, { passive: true });
    document.addEventListener("visibilitychange", wake);
    reduced.addEventListener("change", wake);
    touch.addEventListener("change", wake);
    canvas.addEventListener("webglcontextlost", (event) => {
      event.preventDefault();
      lost = true;
      stop();
      host.dataset.ready = "false";
    });
    canvas.addEventListener("webglcontextrestored", () => {
      renderer?.dispose();
      renderer = null;
      lost = false;
      wake();
    });
    window.addEventListener(
      "pagehide",
      () => {
        stop();
      },
      { once: false },
    );
    window.addEventListener("pageshow", wake);
  });
  document
    .querySelectorAll<HTMLElement>(".glow-card, .button")
    .forEach((element) => {
      element.addEventListener(
        "pointermove",
        (event) => {
          if (reduced.matches || touch.matches || event.pointerType !== "mouse")
            return;
          const rect = element.getBoundingClientRect();
          const x = event.clientX - rect.left,
            y = event.clientY - rect.top;
          element.style.setProperty("--light-x", `${x}px`);
          element.style.setProperty("--light-y", `${y}px`);
          element.style.setProperty(
            "--light-angle",
            `${(Math.atan2(y - rect.height / 2, x - rect.width / 2) * 180) / Math.PI + 90}deg`,
          );
        },
        { passive: true },
      );
    });
}
