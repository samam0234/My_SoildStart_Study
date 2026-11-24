const base = process.env.BASE_URL || "http://localhost:3000";
const paths = ["/health", "/api/posts?q=study"];
const count = 40;
for (const path of paths) {
  const samples = [];
  for (let index = 0; index < count; index++) {
    const start = performance.now();
    const response = await fetch(base + path);
    await response.arrayBuffer();
    if (!response.ok) throw new Error(path + " responded " + response.status);
    samples.push(performance.now() - start);
  }
  samples.sort((left, right) => left - right);
  const at = (percent) => samples[Math.ceil(count * percent) - 1].toFixed(1);
  console.log(JSON.stringify({ path, count, p50ms: at(.50), p95ms: at(.95) }));
}
