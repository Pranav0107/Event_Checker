async function run() {
  try {
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey: 'dummy' });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: "hello"
    });
    console.log(response.text);
  } catch (err) {
    console.error("ERROR:", err);
  }
}
run();
