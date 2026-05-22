import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

// Initialize Gemini client strictly with server-side environment variables as required.
const getAiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not defined in the environment secrets.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Campor 'messages' é obrigatório e deve ser uma array." },
        { status: 400 }
      );
    }

    const ai = getAiClient();

    // Map the simple chat history format from client to the Gemini Content format
    // { role: "user" | "model", parts: [{ text: string }] }
    const formattedContents = messages.map((m: any) => {
      return {
        role: m.role === "assistant" || m.role === "model" ? "model" : "user",
        parts: [{ text: m.text }],
      };
    });

    const systemInstruction = `Você é o "Técnico Canarinho", um treinador profissional de Tênis de Mesa brasileiro, entusiasmado, experiente e muito didático. Seu objetivo é apoiar iniciantes e amadores a evoluírem.
Use linguagem acessível, mas incorpore termos técnicos importantes (ex: spin, cozinhado, top-spin, drive de forehand, bloqueio passivo, grips clássico, classineta e caneta) sempre explicando o que significam se for necessário.
Dê dicas excelentes de postura de expectativa, movimentos de pernas (footwork), ponto de contato com a bola e escolha de equipamentos adequados (madeiras, borrachas tensionadas vs clássicas, etc).
Sempre organize suas dicas em tópicos numerados ou em tópicos curtos e encorajadores. Use uma postura amigável de treinador que quer ver o aluno vencer!
Caso o usuário tente conversar sobre assuntos não relacionados ao tênis de mesa ou esportes de raquete, reconduza-o amigavelmente e de forma criativa de volta ao mundo do ping-pong/tênis de mesa!`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: formattedContents,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    const textOutput = response.text || "Desculpe, não consegui formular uma resposta neste momento. Tente novamente!";

    return NextResponse.json({ text: textOutput });
  } catch (error: any) {
    console.error("Erro no Treinador IA:", error);
    return NextResponse.json(
      { error: error.message || "Ocorreu um erro interno no servidor ao processar a requisição." },
      { status: 500 }
    );
  }
}
