import { useEffect, useRef } from 'react';

// A slow, looping showcase through all four seasons and a range of weather -
// sunny, rain, thunderstorms, wind/falling leaves, snow, tornado, hurricane -
// purely for ambiance (no location, no API, $0). Fixed, pointer-events: none,
// layered behind the app. Lightning strikes (the original theme) still
// happen, but now only during storm-weather scenes instead of constantly.
const SCENE_DURATION_MS = 22000;
const TRANSITION_MS = 2500;

const SEASON_TINT = {
  spring: '120,200,140',
  summer: '255,200,110',
  fall: '210,120,55',
  winter: '170,205,255',
};

const SEQUENCE = [
  { season: 'spring', weather: 'sunny' },
  { season: 'spring', weather: 'rain' },
  { season: 'summer', weather: 'sunny' },
  { season: 'summer', weather: 'thunderstorm' },
  { season: 'fall', weather: 'windy' },
  { season: 'fall', weather: 'hurricane' },
  { season: 'winter', weather: 'snow' },
  { season: 'winter', weather: 'tornado' },
];

// Same fractal-bolt technique as before: biased toward the screen margins so
// a flash never crosses directly through the readable content column.
function generateBolt(width, height) {
  const contentHalfWidth = Math.min(550, width / 2);
  const marginWidth = width / 2 - contentHalfWidth;

  let startX;
  if (marginWidth > 60 && Math.random() < 0.75) {
    const onLeft = Math.random() < 0.5;
    startX = onLeft ? Math.random() * marginWidth : width - Math.random() * marginWidth;
  } else {
    startX = Math.random() * width;
  }

  const endX = startX + (Math.random() - 0.5) * width * 0.2;
  const endY = height * (0.08 + Math.random() * 0.87);

  function subdivide(x1, y1, x2, y2, depth, segments) {
    if (depth <= 0) {
      segments.push([x1, y1, x2, y2]);
      return;
    }
    const midX = (x1 + x2) / 2 + (Math.random() - 0.5) * (x2 - x1 === 0 ? 40 : Math.abs(y2 - y1)) * 0.25;
    const midY = (y1 + y2) / 2;
    subdivide(x1, y1, midX, midY, depth - 1, segments);
    subdivide(midX, midY, x2, y2, depth - 1, segments);

    if (depth === 3 && Math.random() < 0.5) {
      const branchEndX = midX + (Math.random() - 0.5) * 120;
      const branchEndY = midY + Math.abs(y2 - y1) * (0.3 + Math.random() * 0.3);
      subdivide(midX, midY, branchEndX, branchEndY, depth - 2, segments);
    }
  }

  const segments = [];
  subdivide(startX, 0, endX, endY, 6, segments);
  return segments;
}

function makeRain(count, w, h) {
  return Array.from({ length: count }, () => ({
    x: Math.random() * w,
    y: Math.random() * h,
    len: 14 + Math.random() * 18,
    speed: 7 + Math.random() * 6,
  }));
}
function makeSnow(count, w, h) {
  return Array.from({ length: count }, () => ({
    x: Math.random() * w,
    y: Math.random() * h,
    r: 1.5 + Math.random() * 2.5,
    speed: 0.6 + Math.random() * 1.2,
    drift: Math.random() * Math.PI * 2,
  }));
}
function makeLeaves(count, w, h) {
  return Array.from({ length: count }, () => ({
    x: Math.random() * w,
    y: Math.random() * h,
    size: 5 + Math.random() * 5,
    speed: 0.8 + Math.random() * 1,
    sway: Math.random() * Math.PI * 2,
    rot: Math.random() * Math.PI * 2,
    hue: Math.random(),
  }));
}
function makeClouds(count, w, h) {
  return Array.from({ length: count }, () => ({
    x: Math.random() * w,
    y: h * (0.04 + Math.random() * 0.22),
    rx: 130 + Math.random() * 170,
    ry: 40 + Math.random() * 30,
    speed: 0.15 + Math.random() * 0.25,
  }));
}
function makeDebris(count) {
  return Array.from({ length: count }, () => ({
    angle: Math.random() * Math.PI * 2,
    radius: 20 + Math.random() * 120,
    speed: 0.03 + Math.random() * 0.04,
    size: 1 + Math.random() * 2,
  }));
}

export default function WeatherBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let width, height;
    let raf;
    let bolt = null;
    let boltOpacity = 0;
    let nextFlashAt = 0;
    let rain = [], snow = [], leaves = [], clouds = [], debris = [];
    let sceneIndex = -1;
    let sceneStart = 0;

    function resize() {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      clouds = makeClouds(5, width, height);
    }
    resize();
    window.addEventListener('resize', resize);

    function enterScene(idx, now) {
      sceneIndex = idx;
      sceneStart = now;
      const { weather } = SEQUENCE[idx];
      rain = weather === 'hurricane' ? makeRain(260, width, height)
        : (weather === 'rain' || weather === 'thunderstorm') ? makeRain(140, width, height)
        : [];
      snow = weather === 'snow' ? makeSnow(160, width, height) : [];
      leaves = weather === 'windy' ? makeLeaves(60, width, height) : [];
      debris = weather === 'tornado' ? makeDebris(50) : [];
      bolt = null;
      boltOpacity = 0;
      nextFlashAt = now + 1200 + Math.random() * 2000;
    }

    function drawBolt(segments, alpha) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';

      ctx.strokeStyle = `rgba(160, 210, 255, ${alpha * 0.5})`;
      ctx.lineWidth = 6;
      ctx.shadowColor = 'rgba(140, 200, 255, 0.9)';
      ctx.shadowBlur = 20;
      ctx.beginPath();
      segments.forEach(([x1, y1, x2, y2]) => { ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); });
      ctx.stroke();

      ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.lineWidth = 1.6;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      segments.forEach(([x1, y1, x2, y2]) => { ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); });
      ctx.stroke();

      if (alpha > 0.5) {
        const grad = ctx.createRadialGradient(width / 2, 0, 0, width / 2, 0, height * 0.6);
        grad.addColorStop(0, `rgba(150, 190, 255, ${(alpha - 0.5) * 0.12})`);
        grad.addColorStop(1, 'rgba(150, 190, 255, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
      }
      ctx.restore();
    }

    function tick(now) {
      if (sceneIndex === -1) enterScene(0, now);
      let elapsed = now - sceneStart;
      if (elapsed > SCENE_DURATION_MS) {
        enterScene((sceneIndex + 1) % SEQUENCE.length, now);
        elapsed = 0;
      }
      const { season, weather } = SEQUENCE[sceneIndex];
      const fadeIn = Math.min(1, elapsed / TRANSITION_MS);
      const stormy = weather === 'thunderstorm' || weather === 'hurricane' || weather === 'tornado';

      ctx.clearRect(0, 0, width, height);

      // season ambient tint
      ctx.fillStyle = `rgba(${SEASON_TINT[season]},${0.05 * fadeIn})`;
      ctx.fillRect(0, 0, width, height);

      // dark cloud layer (storms + windy fall scenes)
      if (stormy || weather === 'windy') {
        clouds.forEach(c => {
          c.x -= c.speed * (weather === 'hurricane' ? 3.5 : 1);
          if (c.x < -c.rx) c.x = width + c.rx;
          const grad = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.rx);
          grad.addColorStop(0, `rgba(20,18,22,${0.35 * fadeIn})`);
          grad.addColorStop(1, 'rgba(20,18,22,0)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.ellipse(c.x, c.y, c.rx, c.ry, 0, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      // rain
      if (rain.length) {
        const windAngle = weather === 'hurricane' ? 0.55 : 0.15;
        ctx.strokeStyle = `rgba(180,210,255,${0.35 * fadeIn})`;
        ctx.lineWidth = 1;
        rain.forEach(d => {
          ctx.beginPath();
          ctx.moveTo(d.x, d.y);
          ctx.lineTo(d.x - d.len * windAngle, d.y + d.len);
          ctx.stroke();
          d.x -= d.speed * windAngle * 2;
          d.y += d.speed * (weather === 'hurricane' ? 2 : 1.4);
          if (d.y > height) { d.y = -10; d.x = Math.random() * width; }
          if (d.x < -20) d.x = width + 20;
        });
      }

      // snow
      if (snow.length) {
        ctx.fillStyle = `rgba(255,255,255,${0.85 * fadeIn})`;
        snow.forEach(f => {
          f.drift += 0.02;
          f.x += Math.sin(f.drift) * 0.6;
          f.y += f.speed;
          if (f.y > height) { f.y = -5; f.x = Math.random() * width; }
          ctx.beginPath();
          ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      // falling leaves (fall, windy)
      if (leaves.length) {
        leaves.forEach(l => {
          l.sway += 0.03;
          l.rot += 0.02;
          l.x += Math.sin(l.sway) * 1.2 - 0.4;
          l.y += l.speed;
          if (l.y > height) { l.y = -10; l.x = Math.random() * width; }
          ctx.save();
          ctx.translate(l.x, l.y);
          ctx.rotate(l.rot);
          ctx.fillStyle = `rgba(${200 + Math.round(l.hue * 40)}, ${110 + Math.round(l.hue * 60)}, 40, ${0.8 * fadeIn})`;
          ctx.beginPath();
          ctx.ellipse(0, 0, l.size, l.size * 0.6, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        });
      }

      // tornado funnel + swirling debris
      if (weather === 'tornado') {
        const cx = width * 0.5, baseY = height * 0.92, topY = height * 0.15;
        ctx.save();
        ctx.globalAlpha = fadeIn;
        ctx.fillStyle = 'rgba(40,38,42,0.55)';
        ctx.beginPath();
        ctx.moveTo(cx - 6, topY);
        ctx.lineTo(cx + 6, topY);
        ctx.lineTo(cx + 90, baseY);
        ctx.lineTo(cx - 90, baseY);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        const span = baseY - topY;
        debris.forEach(p => {
          p.angle += p.speed;
          const y = baseY - (p.radius / 140) * span;
          const spread = 6 + (1 - (y - topY) / span) * 90;
          const x = cx + Math.cos(p.angle) * spread;
          ctx.fillStyle = `rgba(120,110,90,${0.6 * fadeIn})`;
          ctx.beginPath();
          ctx.arc(x, y, p.size, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      // lightning - storm scenes only
      if (stormy) {
        if (!bolt && now >= nextFlashAt) {
          bolt = generateBolt(width, height);
          boltOpacity = 1;
        }
        if (bolt) {
          const flicker = boltOpacity > 0.85 && Math.random() < 0.15 ? 0.3 : 1;
          drawBolt(bolt, boltOpacity * flicker * fadeIn);
          boltOpacity -= 0.045;
          if (boltOpacity <= 0) {
            bolt = null;
            nextFlashAt = now + (weather === 'hurricane' ? 2500 : 4000) + Math.random() * 4000;
          }
        }
      }

      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="lightning-bg" aria-hidden="true" />;
}
