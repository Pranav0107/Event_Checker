async function run() {
  try {
    const { GoogleGenAI } = await import('@google/genai');
    console.log("SUCCESS:", typeof GoogleGenAI);
  } catch (err) {
    console.error("ERROR:", err);
  }
}
run();
