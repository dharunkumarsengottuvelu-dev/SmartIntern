async function testEvaluate() {
  console.log("Fetching /evaluate?trigger=true...");
  try {
    const res = await fetch("http://localhost:8000/evaluate?trigger=true");
    const text = await res.text();
    console.log("Status:", res.status);
    try {
      console.log("JSON Output:", JSON.stringify(JSON.parse(text), null, 2));
    } catch {
      console.log("Raw Output:", text);
    }
  } catch (err) {
    console.error("Fetch failed:", err);
  }
}

testEvaluate();
