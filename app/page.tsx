"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Flame, 
  Award, 
  Clock, 
  Compass, 
  TrendingUp, 
  Layers, 
  Sparkles, 
  Send, 
  RotateCcw, 
  Info, 
  Check, 
  Plus, 
  Trash2, 
  Play, 
  HelpCircle,
  Activity,
  ArrowRight
} from "lucide-react";

// Types
interface Message {
  role: "user" | "assistant";
  text: string;
}

interface Drill {
  id: string;
  name: string;
  duration: number; // in minutes
  completed: boolean;
  category: "fundamento" | "agilidade" | "efeito" | "saque";
}

const PRESET_ROUTINES = {
  adaptacao: [
    { id: "p1", name: "Controle de Forehand regular simples", duration: 10, completed: false, category: "fundamento" },
    { id: "p2", name: "Controle de Backhand regular simples", duration: 10, completed: false, category: "fundamento" },
    { id: "p3", name: "Exercício de movimentação lateral de 1 passada", duration: 10, completed: false, category: "agilidade" }
  ],
  controle_spin: [
    { id: "s1", name: "Cozinhado de Backhand contra Backspin curto", duration: 15, completed: false, category: "efeito" },
    { id: "s2", name: "Ataque inicial (Drive) contra bola cortada", duration: 15, completed: false, category: "efeito" },
    { id: "s3", name: "Saque curto com efeito cortado para baixo", duration: 10, completed: false, category: "saque" }
  ],
  falkenberg: [
    { id: "ag1", name: "Padrão Falkenberg (1 esquerda, 1 pivot, 1 direita)", duration: 20, completed: false, category: "agilidade" },
    { id: "ag2", name: "Sequência livre de ataque logo após o saque", duration: 15, completed: false, category: "saque" }
  ]
};

export default function Home() {
  // Navigation & UI Tabs
  const [activeTab, setActiveTab] = useState<"fundamentos" | "simulador" | "treinos" | "ia">("fundamentos");

  // Local state for persistence (Grips & Fundamentals inside view)
  const [selectedGrip, setSelectedGrip] = useState<string>("classico");
  const [selectedStroke, setSelectedStroke] = useState<string>("drive_forehand");

  // --- 1. Simulator Interface States ---
  const [incomingSpin, setIncomingSpin] = useState<"topspin" | "backspin" | "flat">("backspin");
  const [paddleAngle, setPaddleAngle] = useState<number>(65); // degrees
  const [shotSpeed, setShotSpeed] = useState<"suave" | "medio" | "forte">("medio");
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [simulationResult, setSimulationResult] = useState<{
    status: "rede" | "fora" | "acertou" | "idle";
    message: string;
    details: string;
    ballPathY: number[]; // trajectory offsets for animation
  }>({
    status: "idle",
    message: "Ajuste o ângulo e o efeito, depois clique em Simular!",
    details: "",
    ballPathY: [120, 120, 120]
  });

  // --- 2. Practice Planner States ---
  const [drills, setDrills] = useState<Drill[]>([]);
  const [customDrillName, setCustomDrillName] = useState<string>("");
  const [customDrillMin, setCustomDrillMin] = useState<number>(15);
  const [customDrillCat, setCustomDrillCat] = useState<"fundamento" | "agilidade" | "efeito" | "saque">("fundamento");
  const [streak, setStreak] = useState<number>(0);
  const [hasLoadedStorage, setHasLoadedStorage] = useState<boolean>(false);

  // --- 3. AI Chat States ---
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      text: "Fala, craque! Sou o Técnico Canarinho. 🏓 🇧🇷\n\nEstou aqui para te transformar em um verdadeiro gigante da mesa! Se tiver dúvidas sobre empunhaduras, como mandar aquele topspin calibrado, devolver cortadas pesadas ou montar seu primeiro conjunto profissional, manda bala na pergunta abaixo!"
    }
  ]);
  const [inputValue, setInputValue] = useState<string>("");
  const [isSending, setIsSending] = useState<boolean>(false);
  const [errorChat, setErrorChat] = useState<string>("");
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Safe client-side loading
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const savedDrills = localStorage.getItem("evoluatm_drills");
        const savedStreak = localStorage.getItem("evoluatm_streak");
        if (savedDrills) {
          setDrills(JSON.parse(savedDrills));
        } else {
          // Initialize with Adaptacao template by default
          setDrills(PRESET_ROUTINES.adaptacao as Drill[]);
        }
        if (savedStreak) {
          setStreak(parseInt(savedStreak, 10));
        } else {
          setStreak(2); // Just to give an initial motivation boost
        }
      } catch (e) {
        console.error("Erro ao ler LocalStorage", e);
      }
      setHasLoadedStorage(true);
    }
  }, []);

  // Save changes
  useEffect(() => {
    if (hasLoadedStorage && typeof window !== "undefined") {
      try {
        localStorage.setItem("evoluatm_drills", JSON.stringify(drills));
        localStorage.setItem("evoluatm_streak", streak.toString());
      } catch (e) {
        console.error("Erro ao escrever LocalStorage", e);
      }
    }
  }, [drills, streak, hasLoadedStorage]);

  // Handle chat auto scroll
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Simulation physics engine logic (rebounding physics)
  const runSimulation = () => {
    setIsSimulating(true);
    setSimulationResult(prev => ({ ...prev, status: "idle" }));

    setTimeout(() => {
      let status: "rede" | "fora" | "acertou" = "acertou";
      let message = "";
      let details = "";
      let ballPathY = [120, 100, 130]; // normal rebound

      if (incomingSpin === "backspin") {
        if (paddleAngle < 40) {
          // way too closed for a backspin cut ball. Hits the net!
          status = "rede";
          message = "Bola direto na REDE! 🛑";
          details = `Com a raquete muito fechada (${paddleAngle}°), o efeito cortado (backspin) gerado pelo oponente puxa a bola violentamente para baixo no momento do contato.`;
          ballPathY = [120, 135, 170];
        } else if (paddleAngle > 80) {
          // too open, flies out
          status = "fora";
          message = "Voou para FORA da mesa! ✈️";
          details = `A raquete estava extremamente aberta (${paddleAngle}°). O efeito cortado contrariou o ar, mas a inclinação excessiva jogou a bola muito alta e para longe da mesa.`;
          ballPathY = [120, 60, 20];
        } else {
          // perfect range for pushing/cozinhando backspin
          status = "acertou";
          message = "REBATIDA PERFEITA! ✅ (Cozinhado Seguro)";
          details = `Ângulo ideal (${paddleAngle}°). Você amorteceu a rotação pesada por baixo da bola, devolvendo um cozinhado curto e baixo que dificulta a iniciativa do adversário.`;
          ballPathY = [120, 105, 140];
        }
      } else if (incomingSpin === "topspin") {
        if (paddleAngle > 60) {
          // too open for aggressive topspin, flies out
          status = "fora";
          message = "Bola explodiu para FORA! ✈️";
          details = `Bolas com topspin (efeito com rotação para frente) sobem violentamente ao tocar em raquetes abertas (${paddleAngle}°). Você precisa fechar o ângulo (virar a face da raquete para baixo).`;
          ballPathY = [120, 50, -10];
        } else if (paddleAngle < 25) {
          // too closed, hits net
          status = "rede";
          message = "Direto na REDE de bloqueio! 🛑";
          details = `Você inclinou excessivamente a raquete para baixo (${paddleAngle}°). Apesar de mitigar a força do topspin, o ângulo fechador não deu espaço para a bola passar sobre a rede.`;
          ballPathY = [120, 145, 175];
        } else {
          status = "acertou";
          message = "BLOQUEIO SENSACIONAL! ✅ (Contra-ataque sólido)";
          details = `Ângulo cirúrgico (${paddleAngle}°). Fechando levemente a raquete, você amorteceu o giro rápido da bola do oponente, direcionando de volta exatamente no fundo da mesa.`;
          ballPathY = [120, 110, 138];
        }
      } else {
        // Flat (No spin)
        if (paddleAngle < 35) {
          status = "rede";
          message = "Rede! Sem impulso vertical. 🛑";
          details = `Bolas sem efeito (planas) precisam de uma rebatida limpa. Com ângulo muito fechado (${paddleAngle}°), ela cai direto sem altura para cruzar a barreira.`;
          ballPathY = [120, 138, 168];
        } else if (paddleAngle > 75) {
          status = "fora";
          message = "Para fora da mesa! ✈️";
          details = `Para rebater bolas planas e sem rotação, manter a raquete muito aberta (${paddleAngle}°) faz com que toda a força do empurrão vire inclinação para fora do limite.`;
          ballPathY = [120, 70, 30];
        } else {
          status = "acertou";
          message = "Ataque Flat Preciso! ✅";
          details = `Grande controle de ângulo (${paddleAngle}°). Batida plana de retorno rápida e direta para empurrar o oponente para longe da mesa.`;
          ballPathY = [120, 105, 135];
        }
      }

      setSimulationResult({
        status,
        message,
        details,
        ballPathY
      });
      setIsSimulating(false);
    }, 1200);
  };

  // --- Add custom drill to list ---
  const handleAddDrill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customDrillName.trim()) return;

    const newDrill: Drill = {
      id: "custom_" + Date.now(),
      name: customDrillName,
      duration: customDrillMin,
      completed: false,
      category: customDrillCat
    };

    setDrills(prev => [...prev, newDrill]);
    setCustomDrillName("");
  };

  // --- Apply drill presets ---
  const applyPreset = (presetKey: "adaptacao" | "controle_spin" | "falkenberg") => {
    const list = PRESET_ROUTINES[presetKey];
    setDrills(list.map(d => ({ ...d, id: d.id + "_" + Date.now(), completed: false } as Drill)));
  };

  // --- Check off drill ---
  const toggleDrill = (id: string) => {
    setDrills(prev => {
      const updated = prev.map(d => d.id === id ? { ...d, completed: !d.completed } : d);
      // If all are completed, offer a streak increase
      const wasAllDoneBefore = prev.length > 0 && prev.every(d => d.completed);
      const isAllDoneNow = updated.length > 0 && updated.every(d => d.completed);
      if (isAllDoneNow && !wasAllDoneBefore) {
        setStreak(s => s + 1);
      }
      return updated;
    });
  };

  // --- Delete drill ---
  const deleteDrill = (id: string) => {
    setDrills(prev => prev.filter(d => d.id !== id));
  };

  // --- AI Chat Service Call ---
  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = customPrompt || inputValue;
    if (!textToSend.trim() || isSending) return;

    setErrorChat("");
    const userMsg: Message = { role: "user", text: textToSend };
    setMessages(prev => [...prev, userMsg]);
    setInputValue("");
    setIsSending(true);

    try {
      const response = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Keep last 8 messages for context to optimize memory and API payload
        body: JSON.stringify({
          messages: [...messages, userMsg].slice(-8),
        }),
      });

      if (!response.ok) {
        throw new Error("Erro de comunicação com o servidor.");
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      setMessages(prev => [...prev, { role: "assistant", text: data.text }]);
    } catch (err: any) {
      console.error(err);
      setErrorChat(err.message || "Ocorreu um erro ao enviar sua dúvida para o treinador. Tente novamente.");
    } finally {
      setIsSending(false);
    }
  };

  // Grips Data Repository
  const GRIPS_DB: any = {
    classico: {
      name: "Clássico (Shakehand)",
      desc: "A empunhadura mais popular e recomendada no mundo contemporâneo. Você segura a raquete como se estivesse apertando a mão de alguém, com o indicador repousado na base da borracha.",
      pros: ["Alcance máximo de backhand", "Transição natural entre pancadas", "Excelente estabilidade defensiva no bloqueio"],
      cons: ["Ponto de transição cego (zona do cotovelo difícil)", "Menor flexibilidade extrema do punho livre"],
      famous: "Hugo Calderano 🇧🇷, Ma Long 🇨🇳, Fan Zhendong 🇨🇳",
      difficulty: "Fácil / Iniciante",
      instructions: "Segure o cabo com os três dedos inferiores. O polegar apoia levemente na face frontal da borracha e o indicador na parte traseira inferior. Mantenha o punho relaxado!"
    },
    caneta: {
      name: "Caneta Tradicional (Penhold)",
      desc: "Histórica e super veloz, originária do estilo asiático. O jogador segura a raquete com o polegar e o indicador circulando o gargalo, idêntico ao manuseio de uma caneta. Usa-se apenas um lado da raquete para rebater.",
      pros: ["Movimentação de punho incrivelmente rápida para spin de forehand", "Nenhum ponto de transição cego centralizado", "Ótimo saque de alta rotação"],
      cons: ["Cansaço físico muito elevado (exige footwork impecável)", "Extremamente vulnerável no lado do backhand tradicional (exige bloqueio com cotovelo recuado)"],
      famous: "Ryu Seung-min 🇰🇷, Ma Lin 🇨🇳, Yoshida Kaii 🇯🇵",
      difficulty: "Difícil / Requer muito treino de pernas",
      instructions: "O cabo fica apontado para cima. Crie um anel ao redor da base da madeira com polegar e indicador. Os outros 3 dedos ficam curvados ou esticados na parte de trás."
    },
    classineta: {
      name: "Classineta (Reverse Penhold Backhand)",
      desc: "A evolução brilhante do modo Caneta. Os dedos seguram como caneta, porém usa-se uma borracha no lado traseiro para atacar de Backhand (RPB). Une o dinamismo da caneta com o ataque do clássico.",
      pros: ["Corrige o lado fraco da caneta tradicional permitindo ataques rápidos", "Excelente para recepções agressivas de saques na rede (Chiquita)"],
      cons: ["Ajuste técnico complexo", "Exige maior esforço nos tendões do punho"],
      famous: "Wang Hao 🇨🇳, Xu Xin 🇨🇳, Felix Lebrun 🇫🇷",
      difficulty: "Média / Avançada",
      instructions: "Mesma postura de dedos do pegada caneta, mas treine torcer o punho para usar o lado de trás (borracha reversa) para bater bolas de backhand de forma ativa."
    }
  };

  // Strokes Data Repository
  const STROKES_DB: any = {
    drive_forehand: {
      name: "Drive de Forehand (Topspin de Direita)",
      angle: "45° (Inclinada para Frente)",
      power: "Alto",
      desc: "O principal movimento de ataque do tênis de mesa. Utilizado para atacar bolas que chegam com rotação neutra ou topspin do adversário.",
      steps: [
        "Inicie o movimento com a raquete abaixo da cintura, corpo levemente rotacionado para a direita.",
        "Transfira o peso do pé direito para o pé esquerdo conforme rotaciona o quadril.",
        "Feche a raquete a aproximadamente 45° no momento do contato rápido na parte superior-traseira da bola.",
        "Termine o arco do braço próximo à altura da testa com swing contínuo."
      ]
    },
    drive_backhand: {
      name: "Drive de Backhand (Topspin de Esquerda)",
      angle: "45° - 50° (Inclinada)",
      power: "Médio-Alto",
      desc: "Um golpe veloz executado à frente do corpo. Excelente para manter pressão e acelerar o jogo de esquerda sem precisar se girar.",
      steps: [
        "Inicie com a raquete posicionada próxima à sua região umbilical.",
        "Use o cotovelo como ponto de apoio/pivô, flexionando o braço para dentro.",
        "Gire o punho de trás para frente, escovando a bola no topo para produzir efeito parabólico.",
        "Estenda o antebraço apontando em direção ao campo adversário."
      ]
    },
    cozinhado: {
      name: "Cozinhado (Push / Rebatida de Defesa)",
      angle: "60° - 75° (Aberta para Cima)",
      power: "Baixo (Controle)",
      desc: "Técnica de contenção usada contra bolas cortadas curtas do oponente, devolvendo o efeito de backspin para impedir que o rival ataque livremente.",
      steps: [
        "Mantenha a raquete aberta (face apontada levemente para cima).",
        "Aborde a bola logo após o quique na mesa adversária (ponto subinte do quique).",
        "Friccione empurrando para frente e deslize por baixo da esfera como se estivesse cortando um pedaço.",
        "Mantenha o toque sensível para que a bola vá curta e baixa, bem rente à rede."
      ]
    },
    bloqueio: {
      name: "Bloqueio Seco (Block Defensivo)",
      angle: "25° - 35° (Bem Fechada)",
      power: "Baixo (Usa a força do rival)",
      desc: "Sua principal defesa contra os drives rápidos. Em vez de golpear, você age como uma parede sólida, redirecionando o momentum da bola adversária.",
      steps: [
        "Não realize swing longo. Mantenha o movimento extremamente curto à frente do peito.",
        "Ajuste a angulação da raquete com o punho bem firme (ângulo bem fechado para interceptar a subida veloz).",
        "Apenas amorteça o impacto, empurrando sutilmente de volta apontando para o canto correspondente da quadra."
      ]
    }
  };

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case "fundamento": return "bg-blue-600/10 text-blue-400 border-blue-500/20";
      case "agilidade": return "bg-amber-600/10 text-amber-400 border-amber-500/20";
      case "efeito": return "bg-red-600/10 text-red-450 text-red-400 border-red-500/20";
      case "saque": return "bg-purple-600/10 text-purple-400 border-purple-500/20";
      default: return "bg-slate-800 text-slate-300 border-slate-700/30";
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-200 selection:bg-red-600 selection:text-white font-sans antialiased">
      {/* HEADER SPORTS DESIGN */}
      <header id="header-brand" className="h-20 border-b border-slate-800 flex items-center justify-between px-6 md:px-10 bg-slate-950/50 backdrop-blur-md relative overflow-hidden shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center border-2 border-white/20 shadow-lg shadow-red-950/50 relative shrink-0">
            <div className="w-4 h-4 bg-white rounded-full"></div>
            <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-white rounded-full animate-ping" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display font-black text-2xl tracking-tighter text-white uppercase">
                EVOLUA<span className="text-red-500">TM</span>
              </span>
              <span className="text-[10px] tracking-widest font-mono font-bold uppercase py-0.5 px-2 bg-slate-800 rounded text-red-500 border border-slate-700">
                PRO ACADEMY
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-sans hidden sm:block">Seu portal de mentoria, física e treinos de alto nível</p>
          </div>
        </div>

        {/* Tab Selection Navigation matching the red, high-contrast, professional design */}
        <nav id="navbar-tabs" className="hidden lg:flex gap-8 text-xs font-bold uppercase tracking-widest text-slate-400">
          <button
            onClick={() => setActiveTab("fundamentos")}
            className={`transition-all py-2.5 relative cursor-pointer ${
              activeTab === "fundamentos" ? "text-red-500 font-extrabold" : "hover:text-white"
            }`}
          >
            Guias & Empunhaduras
            {activeTab === "fundamentos" && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-500 rounded-full" />}
          </button>
          <button
            onClick={() => setActiveTab("simulador")}
            className={`transition-all py-2.5 relative cursor-pointer flex items-center gap-1.5 ${
              activeTab === "simulador" ? "text-red-500 font-extrabold" : "hover:text-white"
            }`}
          >
            Simulador de Spin
            <span className="px-1 py-0.2 bg-red-600 text-white text-[8px] font-black rounded tracking-tight animate-pulse">NOVO</span>
            {activeTab === "simulador" && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-500 rounded-full" />}
          </button>
          <button
            onClick={() => setActiveTab("treinos")}
            className={`transition-all py-2.5 relative cursor-pointer ${
              activeTab === "treinos" ? "text-red-500 font-extrabold" : "hover:text-white"
            }`}
          >
            Cronoficha
            {drills.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-slate-800 text-red-400 text-[10px] rounded-full font-mono">
                {drills.filter(d => d.completed).length}/{drills.length}
              </span>
            )}
            {activeTab === "treinos" && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-500 rounded-full" />}
          </button>
          <button
            onClick={() => setActiveTab("ia")}
            className={`transition-all py-2.5 relative cursor-pointer flex items-center gap-1 ${
              activeTab === "ia" ? "text-red-500 font-extrabold" : "hover:text-white"
            }`}
          >
            Treinador IA
            {activeTab === "ia" && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-500 rounded-full" />}
          </button>
        </nav>

        {/* Training goal stats */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-sm">
            <Flame className="w-3.5 h-3.5 text-red-500 animate-pulse fill-red-500" />
            <span className="text-xs font-mono font-bold text-white tracking-widest leading-none">
              {streak} Dias Ativo
            </span>
          </div>
          <button
            onClick={() => setActiveTab("treinos")}
            className="hidden md:block bg-red-600 hover:bg-red-750 hover:bg-red-700 text-white px-5 py-2 rounded-sm text-xs font-bold uppercase tracking-widest transition-all"
          >
            Acessar Treino
          </button>
        </div>
      </header>

      {/* Mobile/Tablet Sub-Header Tab strip */}
      <div className="lg:hidden bg-slate-950 border-b border-slate-800 sticky top-z-20 z-10">
        <div className="px-4">
          <nav className="flex overflow-x-auto gap-2 py-3 no-scrollbar scroll-smooth">
            <button
              onClick={() => setActiveTab("fundamentos")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-sm uppercase tracking-wider font-mono transition-all whitespace-nowrap ${
                activeTab === "fundamentos" 
                  ? "bg-red-600 text-white" 
                  : "text-slate-400 hover:bg-slate-900 hover:text-white"
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              Empunhaduras
            </button>

            <button
              onClick={() => setActiveTab("simulador")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-sm uppercase tracking-wider font-mono transition-all whitespace-nowrap ${
                activeTab === "simulador" 
                  ? "bg-red-600 text-white" 
                  : "text-slate-400 hover:bg-slate-900 hover:text-white"
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              Simulador
            </button>

            <button
              onClick={() => setActiveTab("treinos")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-sm uppercase tracking-wider font-mono transition-all whitespace-nowrap ${
                activeTab === "treinos" 
                  ? "bg-red-600 text-white" 
                  : "text-slate-400 hover:bg-slate-900 hover:text-white"
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              Treinos ({drills.length})
            </button>

            <button
              onClick={() => setActiveTab("ia")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-sm uppercase tracking-wider font-mono transition-all whitespace-nowrap ${
                activeTab === "ia" 
                  ? "bg-red-600 text-white" 
                  : "text-slate-400 hover:bg-slate-900 hover:text-white"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Treinador IA
            </button>
          </nav>
        </div>
      </div>

      {/* MAIN CONTAINER HERO PASS (Design Section 1 on active tab) */}
      <section className="px-6 md:px-10 py-10 bg-gradient-to-r from-slate-950 to-slate-900 border-b border-slate-900">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="max-w-xl">
            <span className="text-red-500 text-xs font-black uppercase tracking-[0.3em] block mb-3 italic">Guia Definitivo de Evolução</span>
            <h1 className="text-4xl md:text-5xl font-extrabold text-white leading-tight mb-4 tracking-tight">
              DOMINE A MESA.<br /><span className="text-slate-500 text-3xl md:text-4xl">EVOLUA SEU JOGO HOJE.</span>
            </h1>
            <p className="text-slate-400 text-sm md:text-base leading-relaxed mb-6">
              Aprenda as técnicas dos atletas profissionais, domine o efeito e calibe seus ângulos. Conteúdo estruturado para quem busca consistência máxima e alta performance na raquete.
            </p>
            <div className="flex flex-wrap gap-4">
              <div className="bg-slate-900 p-4 border-l-4 border-red-500 rounded-r-sm min-w-[170px]">
                <p className="text-[10px] text-slate-500 uppercase font-black tracking-wider mb-1">Status do Treino</p>
                <p className="text-white text-sm font-bold">Consistência Diária</p>
              </div>
              <div className="bg-slate-900 p-4 border-l-4 border-slate-600 rounded-r-sm min-w-[170px]">
                <p className="text-[10px] text-slate-500 uppercase font-black tracking-wider mb-1">Foco Técnico</p>
                <p className="text-white text-sm font-bold">Empunhadura & Física</p>
              </div>
            </div>
          </div>
          
          {/* Visual Decoration */}
          <div className="relative shrink-0 hidden md:block select-none pointer-events-none">
            <div className="w-64 h-64 border-2 border-slate-900 rounded-full flex items-center justify-center opacity-70">
              <div className="w-48 h-48 border border-slate-800 rounded-full flex items-center justify-center">
                 <div className="w-32 h-32 bg-slate-900/30 rounded-full flex items-center justify-center border border-slate-700">
                   <div className="text-5xl">🏓</div>
                 </div>
              </div>
            </div>
            <div className="absolute -top-2 -right-2 bg-red-600 text-white text-[10px] font-black w-14 h-14 rounded-full flex items-center justify-center text-center uppercase leading-tight transform rotate-12 border-2 border-slate-950 shadow-lg">
              100%<br />Pro
            </div>
          </div>
        </div>
      </section>

      {/* PRIMARY CONTROLLER GRID BODY */}
      <main className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 py-8">
        
        {/* VIEW 1: FUNDAMENTOS / TUTORIALS */}
        {activeTab === "fundamentos" && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-8"
          >
            {/* GRIP SELECTOR & CARD */}
            <div id="grips-section" className="lg:col-span-1 flex flex-col gap-6">
              <div className="bg-slate-900 p-6 rounded-sm border border-slate-850 shadow-2xl">
                <div className="flex items-center gap-2.5 mb-4">
                  <Layers className="w-5 h-5 text-red-500" />
                  <h2 className="font-display font-black text-lg text-white uppercase tracking-tight">Como Segurar a Raquete (Grips)</h2>
                </div>
                <p className="text-xs text-slate-400 mb-6 font-sans leading-relaxed">
                  A empunhadura determina sua sensibilidade, alcance físico e facilidade de produzir rotações. Selecione para estudar as especificações estruturais:
                </p>

                {/* Vertical Tabs */}
                <div className="flex flex-col gap-2">
                  <button 
                    id="grip-btn-classico"
                    onClick={() => setSelectedGrip("classico")}
                    className={`flex items-center justify-between p-3.5 rounded-sm text-left border text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                      selectedGrip === "classico"
                        ? "bg-red-600/10 text-red-400 border-red-500/50"
                        : "bg-slate-950 text-slate-400 border-slate-850 hover:bg-slate-900"
                    }`}
                  >
                    <div>
                      <span>Pegada Clássico</span>
                      <span className="block text-[10px] lowercase font-mono font-normal text-slate-500 tracking-tight mt-0.5">Indicado para 95% dos evoluídos</span>
                    </div>
                    {selectedGrip === "classico" && <div className="w-2 h-2 rounded-full bg-red-500" />}
                  </button>

                  <button 
                    id="grip-btn-caneta"
                    onClick={() => setSelectedGrip("caneta")}
                    className={`flex items-center justify-between p-3.5 rounded-sm text-left border text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                      selectedGrip === "caneta"
                        ? "bg-red-600/10 text-red-400 border-red-500/50"
                        : "bg-slate-950 text-slate-400 border-slate-850 hover:bg-slate-900"
                    }`}
                  >
                    <div>
                      <span>Pegada Caneta Tradicional</span>
                      <span className="block text-[10px] lowercase font-mono font-normal text-slate-500 tracking-tight mt-0.5">Estilo clássico de alta agilidade</span>
                    </div>
                    {selectedGrip === "caneta" && <div className="w-2 h-2 rounded-full bg-red-500" />}
                  </button>

                  <button 
                    id="grip-btn-classineta"
                    onClick={() => setSelectedGrip("classineta")}
                    className={`flex items-center justify-between p-3.5 rounded-sm text-left border text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                      selectedGrip === "classineta"
                        ? "bg-red-600/10 text-red-400 border-red-500/50"
                        : "bg-slate-950 text-slate-400 border-slate-850 hover:bg-slate-900"
                    }`}
                  >
                    <div>
                      <span>Pegada Classineta (RPB)</span>
                      <span className="block text-[10px] lowercase font-mono font-normal text-slate-500 tracking-tight mt-0.5">O híbrido ofensivo contemporâneo</span>
                    </div>
                    {selectedGrip === "classineta" && <div className="w-2 h-2 rounded-full bg-red-500" />}
                  </button>
                </div>
              </div>

              {/* Tips banner card with professional styles */}
              <div className="bg-slate-900 text-white p-6 rounded-sm border border-slate-850 border-l-4 border-red-500 shadow-2xl relative overflow-hidden">
                <div className="absolute top-1/2 right-0 transform translate-x-12 -translate-y-12 opacity-[0.03] font-display text-9xl font-black pointer-events-none">
                  PRO
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-red-500 text-xs font-bold uppercase tracking-widest block italic">Dica Master de Postura</span>
                </div>
                <p className="text-xs text-slate-350 leading-relaxed font-sans mb-3">
                  Sempre apoie o peso corporal na ponta dos pés com os joelhos flexionados e pernas afastadas além da linha dos ombros. Nunca permaneça com as pernas totalmente esticadas ao receber a bola!
                </p>
                <button 
                  onClick={() => {
                    setActiveTab("ia");
                    handleSendMessage("Diga dicas avançadas de movimentação de pernas (footwork) para quem está iniciando");
                  }} 
                  className="flex items-center gap-1.5 text-xs text-red-400 hover:text-white transition-colors font-bold uppercase tracking-wider"
                >
                  Estudar Footwork <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* GRIP DETAILS PANEL & STROKES */}
            <div id="grip-details-section" className="lg:col-span-2 flex flex-col gap-6">
              {/* Active Grip Detail Panel */}
              <div className="bg-slate-900 p-6 rounded-sm border border-slate-850 shadow-2xl relative">
                <div className="absolute top-4 right-4 bg-slate-950 py-1 px-3 rounded-sm text-[10px] font-bold text-red-400 border border-slate-850 uppercase font-mono tracking-wider">
                  Dificuldade: {GRIPS_DB[selectedGrip].difficulty}
                </div>

                <span className="text-xs font-bold text-red-500 uppercase font-mono tracking-widest">Estudo Analítico do Grip</span>
                <h2 className="font-display font-black text-2xl text-white mt-1 border-b border-slate-850 pb-3 mb-4 leading-none uppercase tracking-tight">
                  # {GRIPS_DB[selectedGrip].name}
                </h2>

                <p className="text-xs md:text-sm text-slate-300 mb-6 leading-relaxed font-sans">
                  {GRIPS_DB[selectedGrip].desc}
                </p>

                {/* GRID FOR PROS & CONS */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="bg-slate-950/60 p-4 rounded-sm border border-slate-850 border-l-4 border-emerald-500">
                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1.5 mb-3 font-mono">
                      <span className="flex w-1.5 h-1.5 rounded-full bg-emerald-500" /> Vantagens Principais
                    </span>
                    <ul className="text-xs text-slate-300 flex flex-col gap-2 font-sans">
                      {GRIPS_DB[selectedGrip].pros.map((p: string, i: number) => (
                        <li key={i} className="flex gap-1.5">
                          <span className="text-emerald-500 font-bold">•</span>
                          <span>{p}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-slate-950/60 p-4 rounded-sm border border-slate-850 border-l-4 border-red-500">
                    <span className="text-xs font-bold text-red-400 uppercase tracking-widest flex items-center gap-1.5 mb-3 font-mono">
                      <span className="flex w-1.5 h-1.5 rounded-full bg-red-500" /> Vantagens adversas / Limitadores
                    </span>
                    <ul className="text-xs text-slate-300 flex flex-col gap-2 font-sans">
                      {GRIPS_DB[selectedGrip].cons.map((c: string, i: number) => (
                        <li key={i} className="flex gap-1.5">
                          <span className="text-red-500 font-bold">•</span>
                          <span>{c}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* HOW TO GRIP INSTRUCTIONS */}
                <div className="bg-slate-950 p-4 border border-slate-850 rounded-sm mb-6">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono block mb-2">Treino Físico do Encaixe:</span>
                  <p className="text-xs text-slate-300 leading-relaxed font-sans font-light">
                    {GRIPS_DB[selectedGrip].instructions}
                  </p>
                </div>

                {/* FAMOUS ATHLETES */}
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 border-t border-slate-850/50 pt-4">
                  <span className="font-semibold uppercase tracking-widest font-mono text-[9px] text-slate-500 uppercase">Profissionais Referência:</span>
                  <span className="font-bold text-white font-mono">{GRIPS_DB[selectedGrip].famous}</span>
                </div>
              </div>

              {/* CORE MOVEMENTS TUTORIAL AREA */}
              <div id="strokes-selector" className="bg-slate-900 p-6 rounded-sm border border-slate-850 shadow-2xl">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-slate-850 pb-4 mb-5">
                  <div>
                    <h2 className="font-display font-black text-lg text-white uppercase tracking-tight">Controle e Ataques de Raquete</h2>
                    <p className="text-xs text-slate-400 font-sans mt-0.5">Selecione o golpe técnico para simular sua física angular e biomecânica</p>
                  </div>
                  {/* Selector pills */}
                  <div className="flex flex-wrap gap-1.5">
                    {Object.keys(STROKES_DB).map((key) => (
                      <button
                        key={key}
                        onClick={() => setSelectedStroke(key)}
                        className={`px-3 py-1.5 text-xs font-bold rounded-sm uppercase tracking-wider font-mono transition-colors cursor-pointer ${
                          selectedStroke === key
                            ? "bg-red-600 text-white"
                            : "bg-slate-950 text-slate-400 hover:bg-slate-800"
                        }`}
                      >
                        {STROKES_DB[key].name.split(" ")[0]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* ACTIVE STROKE DETAILS */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                  <div className="md:col-span-4 flex flex-col items-center justify-center p-4 bg-slate-950 rounded-sm border border-slate-850 relative min-h-[220px]">
                    
                    {/* Visual schematic of racket angle */}
                    <span className="text-[9px] font-bold text-slate-500 font-mono tracking-widest uppercase mb-1">Ângulo de Ataque</span>
                    <span className="text-xl font-bold text-red-500 font-mono mb-3">{STROKES_DB[selectedStroke].angle}</span>

                    {/* SVG graphic of the angle */}
                    <div className="relative w-28 h-28 flex items-center justify-center border border-dashed border-slate-800 rounded-full bg-slate-900 shadow-inner">
                      
                      {/* Grid center indicators */}
                      <div className="absolute w-full h-[1px] bg-slate-850" />
                      <div className="absolute h-full w-[1px] bg-slate-850" />

                      {/* Simulated racket face line */}
                      <div 
                        className="absolute w-12 h-2 bg-red-600 rounded-sm shadow-md transition-transform duration-500"
                        style={{
                          transform: `rotate(${
                            selectedStroke === "drive_forehand" ? "-45" : 
                            selectedStroke === "drive_backhand" ? "-35" : 
                            selectedStroke === "cozinhado" ? "35" : "-70"
                          }deg)`
                        }}
                      >
                        <div className="absolute top-1/2 left-0 right-0 h-[3px] bg-black/40" />
                        <div className="absolute -left-6 top-1/2 -translate-y-1/2 w-6 h-1 bg-amber-900 rounded-sm origin-right" />
                      </div>

                      {/* Base shadow table line */}
                      <div className="absolute bottom-3 w-16 h-1.5 bg-slate-800 rounded-sm" />
                    </div>

                    <span className="text-[10px] font-bold text-slate-550 font-mono tracking-wider text-slate-400 mt-3 text-center">
                      {STROKES_DB[selectedStroke].power === "Alto" ? "⚡ Impacto Alto" : STROKES_DB[selectedStroke].power === "Médio-Alto" ? "🔥 Impacto Moderado" : "🛡️ Amortecimento"}
                    </span>
                  </div>

                  <div className="md:col-span-8">
                    <h3 className="text-lg font-bold font-display text-white uppercase tracking-tight mb-2">
                      {STROKES_DB[selectedStroke].name}
                    </h3>
                    <p className="text-xs md:text-sm text-slate-300 mb-4 font-sans leading-relaxed">
                      {STROKES_DB[selectedStroke].desc}
                    </p>

                    <div>
                      <span className="text-xs font-bold uppercase text-red-500 font-mono tracking-wider block mb-2">Sequência de Execução Prática:</span>
                      <ol className="text-xs text-slate-300 flex flex-col gap-2">
                        {STROKES_DB[selectedStroke].steps.map((st: string, idx: number) => (
                          <li key={idx} className="flex gap-2 items-start font-sans">
                            <span className="font-mono text-[10px] font-black text-red-500 bg-red-500/10 w-5 h-5 rounded-sm flex items-center justify-center shrink-0 border border-red-500/20">
                              0{idx + 1}
                            </span>
                            <span className="leading-normal pt-0.5">{st}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* VIEW 2: PHYSICS & ANGLE SIMULATOR */}
        {activeTab === "simulador" && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }} 
            animate={{ opacity: 1, scale: 1 }} 
            transition={{ duration: 0.3 }}
            className="flex flex-col gap-8"
          >
            {/* Header intro of simulator */}
            <div className="bg-slate-900 p-6 rounded-sm border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden">
              <div className="max-w-xl relative z-10">
                <span className="px-2.5 py-0.5 bg-red-500/10 text-red-500 text-[11px] font-mono font-bold border border-red-500/20 rounded-sm uppercase tracking-wider">Laboratório Prático</span>
                <h2 className="font-display font-black text-2.5xl text-white mt-2 uppercase tracking-tight">Simulador Físico de Ângulo de Rebatida</h2>
                <p className="text-sm text-slate-400 mt-1 font-sans leading-relaxed">
                  Muitos iniciantes erram saques ou rebatem para fora porque ignoram o impacto da <strong className="text-red-400">rotação (spin)</strong> no ângulo da borracha. Escolha o efeito da bola que vem do oponente, mude o ângulo da raquete e simule a física em tempo real!
                </p>
              </div>
              <div className="bg-slate-950 text-slate-300 p-4 rounded-sm border border-slate-800 flex items-center gap-3 md:max-w-xs shrink-0 relative z-10 shadow-lg">
                <HelpCircle className="w-8 h-8 text-red-500 shrink-0" />
                <div className="text-xs leading-normal font-sans text-slate-300">
                  <strong className="text-white">Regra de ouro:</strong><br />
                  Contra o spin pesado para baixo (<span className="text-red-400">corte</span>), abra a raquete. Contra topspin rápido, feche-a!
                </div>
              </div>
            </div>

            {/* SIMULATOR CORE BOARD */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Left Column Controls */}
              <div className="lg:col-span-12 xl:col-span-5 flex flex-col gap-5">
                <div className="bg-slate-900 p-6 rounded-sm border border-slate-800 shadow-xl">
                  <h3 className="font-display font-bold text-xs uppercase text-slate-400 tracking-widest mb-4 border-b border-slate-800 pb-2 flex items-center gap-1.5">
                    <span className="text-red-500 font-mono">01.</span> Rotação do Saque Recebido
                  </h3>

                  {/* Incoming Spin Cards */}
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => {
                        setIncomingSpin("backspin");
                        setPaddleAngle(65); // suggested starter
                      }}
                      className={`p-3 rounded-sm border flex flex-col items-center gap-2 transition-all text-center cursor-pointer ${
                        incomingSpin === "backspin"
                          ? "bg-red-500/10 border-red-500 text-white font-extrabold shadow-md shadow-red-950/20"
                          : "bg-slate-950 border-slate-850 text-slate-400 border-slate-800 hover:bg-slate-900 hover:text-white"
                      }`}
                    >
                      <RotateCcw className={`w-5 h-5 text-red-500 ${incomingSpin === "backspin" ? "animate-spin-reverse" : ""}`} />
                      <span className="text-xs block leading-tight">Backspin<br/><span className="text-[10px] opacity-70">(Cortado)</span></span>
                    </button>

                    <button
                      onClick={() => {
                        setIncomingSpin("topspin");
                        setPaddleAngle(35); // suggested starter
                      }}
                      className={`p-3 rounded-sm border flex flex-col items-center gap-2 transition-all text-center cursor-pointer ${
                        incomingSpin === "topspin"
                          ? "bg-red-500/10 border-red-500 text-white font-extrabold shadow-md shadow-red-950/20"
                          : "bg-slate-950 border-slate-850 text-slate-400 border-slate-800 hover:bg-slate-900 hover:text-white"
                      }`}
                    >
                      <RotateCcw className={`w-5 h-5 text-red-500 ${incomingSpin === "topspin" ? "animate-spin" : ""}`} />
                      <span className="text-xs block leading-tight">Topspin<br/><span className="text-[10px] opacity-70">(Rotação)</span></span>
                    </button>

                    <button
                      onClick={() => {
                        setIncomingSpin("flat");
                        setPaddleAngle(50); // suggested starter
                      }}
                      className={`p-3 rounded-sm border flex flex-col items-center gap-2 transition-all text-center cursor-pointer ${
                        incomingSpin === "flat"
                          ? "bg-red-500/10 border-red-500 text-white font-extrabold shadow-md shadow-red-950/20"
                          : "bg-slate-950 border-slate-850 text-slate-400 border-slate-800 hover:bg-slate-900 hover:text-white"
                      }`}
                    >
                      <span className="text-lg leading-none filter brightness-90">➡️</span>
                      <span className="text-xs block leading-tight">Plana<br/><span className="text-[10px] opacity-70">(Sem Giro)</span></span>
                    </button>
                  </div>

                  {/* Info alert dynamic message */}
                  <div className="mt-4 bg-slate-950 p-3 rounded-sm border border-slate-850 flex items-start gap-2.5 text-xs text-slate-400">
                    <Info className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <span>
                      {incomingSpin === "backspin" && "Cuidado: Bolas cortadas morrem na rede se você não raspar abaixo dela abrindo o vetor de força."}
                      {incomingSpin === "topspin" && "Aviso: Ataques agressivos de rotação sobem muito rápido, feche a pá!"}
                      {incomingSpin === "flat" && "Golpes fáceis: Basta dar impulso médio direcionando ao outro lado de forma moderada."}
                    </span>
                  </div>
                </div>

                <div className="bg-slate-900 p-6 rounded-sm border border-slate-800 shadow-xl">
                  <h3 className="font-display font-bold text-xs uppercase text-slate-400 tracking-widest mb-4 border-b border-slate-800 pb-2 flex items-center gap-1.5">
                    <span className="text-red-500 font-mono">02.</span> Ajuste Fino da Raquete
                  </h3>

                  {/* SLIDER FOR PADDLE ANGLE */}
                  <div className="mb-6">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-xs font-bold text-slate-300">Inclinação da Raquete</span>
                      <span className="px-2 py-0.5 bg-slate-950 text-red-500 border border-slate-850 rounded-sm text-xs font-mono font-bold">
                        {paddleAngle}° {paddleAngle < 40 ? "(Fechada/Ataque)" : paddleAngle > 70 ? "(Aberta/Defensa)" : "(Média)"}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="90"
                      step="5"
                      value={paddleAngle}
                      onChange={(e) => setPaddleAngle(parseInt(e.target.value))}
                      className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-red-650 accent-red-600"
                    />
                    <div className="flex justify-between text-[9px] text-slate-500 font-mono mt-1">
                      <span>10° (Extremamente Fechada)</span>
                      <span>90° (Totalmente Aberta)</span>
                    </div>
                  </div>

                  {/* SPEED SELECTION */}
                  <div className="mb-6">
                    <span className="text-xs font-bold text-slate-300 block mb-2">Velocidade da Rebatida</span>
                    <div className="grid grid-cols-3 gap-1.5 bg-slate-950 p-1 rounded-sm border border-slate-850">
                      {["suave", "medio", "forte"].map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setShotSpeed(v as any)}
                          className={`py-1 rounded-sm text-xs px-2 cursor-pointer font-bold capitalize transition-colors ${
                            shotSpeed === v
                              ? "bg-red-650 bg-red-650 bg-red-600 text-white font-black shadow-sm"
                              : "text-slate-400 hover:text-white"
                          }`}
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* FIRE BUTTON */}
                  <button
                    onClick={runSimulation}
                    disabled={isSimulating}
                    className="w-full py-3.5 px-4 bg-red-650 bg-red-600 hover:bg-red-500 text-white font-display font-bold text-xs tracking-widest uppercase rounded-sm flex items-center justify-center gap-2 transition-all shadow-md active:translate-y-[1px] disabled:opacity-50 cursor-pointer"
                  >
                    {isSimulating ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Simulando Física...
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 text-white fill-current" />
                        Simular Rebatida Dianteira
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Right Column Animations & Result Sandbox Display */}
              <div className="lg:col-span-12 xl:col-span-7 flex flex-col gap-6">
                
                {/* Simulated table canvas */}
                <div className="bg-slate-900 p-6 rounded-sm border border-slate-800 shadow-2xl relative min-h-[300px] flex flex-col justify-between overflow-hidden">
                  
                  {/* Table decorations */}
                  <div className="absolute top-1/2 left-0 right-0 h-[1.5px] bg-slate-800/60 border-dashed z-0" />
                  <div className="absolute top-0 bottom-0 left-1/2 w-[1.5px] bg-slate-800/60 z-0" />

                  {/* Small header indicator */}
                  <div className="flex justify-between items-center relative z-10">
                    <span className="text-[10px] font-mono font-black text-red-500 bg-red-550/10 bg-red-500/10 py-1 px-2.5 rounded-sm border border-red-500/20">
                      VETOR FISICO DE TRAJETÓRIA
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      Oponente à Esquerda | Você à Direita
                    </span>
                  </div>

                  {/* PHYSICAL ANIMATION BOX */}
                  <div className="relative h-44 flex items-center justify-center my-4 z-10">
                    
                    {/* Simplified Tennis Table View */}
                    <svg className="w-full h-full max-w-lg" viewBox="0 0 400 180">
                      
                      {/* Grid Line floor indicators */}
                      <line x1="10" y1="140" x2="390" y2="140" stroke="#1e293b" strokeWidth="4" />
                      
                      {/* Net vertically center */}
                      <line x1="200" y1="90" x2="200" y2="140" stroke="#334155" strokeWidth="3" />
                      <rect x="195" y="90" width="10" height="4" fill="#ef4444" />
                      
                      {/* LABELS */}
                      <text x="50" y="158" fill="#475569" fontSize="9" fontFamily="monospace" fontWeight="bold" textAnchor="middle">CAMPO RIVAL</text>
                      <text x="350" y="158" fill="#475569" fontSize="9" fontFamily="monospace" fontWeight="bold" textAnchor="middle">SEU CAMPO</text>

                      {/* Opponent point launch point */}
                      <circle cx="30" cy="115" r="4" fill="#ef4444" />
                      
                      {/* DYNAMIC SHOT PATH line showing simulation trajectory direction */}
                      <AnimatePresence>
                        {!isSimulating && simulationResult.status !== "idle" && (
                          <motion.path
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                            d={
                              simulationResult.status === "rede"
                                ? "M 30,115 Q 120,80 195,130" // hits net
                                : simulationResult.status === "fora"
                                ? "M 30,115 Q 210,50 395,65" // flies outside
                                : "M 30,115 Q 160,85 200,105 Q 270,125 330,138" // clean hit
                            }
                            fill="none"
                            stroke="#ef4444"
                            strokeWidth="3"
                            strokeDasharray="4"
                          />
                        )}
                      </AnimatePresence>

                      {/* Animated Ball itself */}
                      {isSimulating ? (
                        <circle cx="200" cy="90" r="6" fill="#ef4444" className="animate-ping" />
                      ) : (
                        <circle 
                          cx={simulationResult.status === "rede" ? 193 : simulationResult.status === "fora" ? 385 : 330}
                          cy={simulationResult.status === "rede" ? 132 : simulationResult.status === "fora" ? 64 : 138}
                          r="6.5" 
                          fill="#ffffff"
                          stroke="#ef4444"
                          strokeWidth="2.5"
                        />
                      )}

                      {/* RACKET VISUAL OVERLAY ON THE RIGHT */}
                      <g transform={`translate(325, 90) rotate(${paddleAngle - 90})`}>
                        {/* Blade rubber red */}
                        <rect x="-14" y="-2" width="28" height="5" rx="1.5" fill="#ef4444" />
                        {/* wooden support handle */}
                        <rect x="-3" y="3" width="6" height="13" rx="1" fill="#b45309" />
                      </g>
                    </svg>

                  </div>

                  {/* BOTTOM RESULT LABEL CARD */}
                  <div className="bg-slate-950/80 border border-slate-850 p-3.5 rounded-sm text-center">
                    <div className="text-[10px] text-slate-450 text-slate-500 font-mono tracking-wider uppercase mb-1">MÉTRICA DO IMPACTO</div>
                    <div className="text-md font-bold text-white font-display uppercase tracking-wider">
                      {simulationResult.message}
                    </div>
                  </div>
                </div>

                {/* SIMULATOR VERDICT CRITIQUE */}
                {simulationResult.status !== "idle" && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-6 rounded-sm border ${
                      simulationResult.status === "acertou"
                        ? "bg-emerald-950/20 text-emerald-350 border-emerald-500/30 text-emerald-400"
                        : "bg-red-950/20 text-red-350 border-red-500/30 text-red-400"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl">
                        {simulationResult.status === "acertou" ? "🏆 " : "💡 "}
                      </span>
                      <h4 className="font-display font-black text-xs uppercase tracking-widest">
                        Diagnóstico Mecânico da Rebatida:
                      </h4>
                    </div>
                    <p className="text-xs md:text-sm leading-relaxed text-slate-300">
                      {simulationResult.details}
                    </p>

                    {simulationResult.status !== "acertou" && (
                      <div className="mt-4 pt-3 border-t border-red-500/10 flex gap-2 items-start md:items-center flex-wrap">
                        <span className="text-xs font-bold font-mono text-red-500 uppercase tracking-wider shrink-0">Dica de Postura:</span>
                        <span className="text-xs text-slate-350 font-medium text-slate-400">
                          {incomingSpin === "backspin" 
                            ? "Aumente o ângulo da pá para cima (~65° a ~75°) e use um swing ascendente rasgando por baixo." 
                            : "Feche bem a pá (~30° a ~35°) travando firmemente contra a energia do topspin dianteiro."}
                        </span>
                      </div>
                    )}
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* VIEW 3: PRACTICEPLANNER / TREINOS */}
        {activeTab === "treinos" && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-8"
          >
            {/* Presets and routines left column */}
            <div className="lg:col-span-12 xl:col-span-4 flex flex-col gap-6">
              <div className="bg-slate-900 p-6 rounded-sm border border-slate-800 shadow-xl">
                <div className="flex items-center gap-2 mb-3">
                  <Award className="w-5 h-5 text-red-500" />
                  <h3 className="font-display font-black text-lg text-white uppercase tracking-tight">Rotinas Desenhadas</h3>
                </div>
                <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                  Selecione uma rotina diária desenhada por treinadores profissionais para aplicar imediatamente como suas metas de evolução.
                </p>

                <div className="flex flex-col gap-2.5">
                  <button
                    onClick={() => applyPreset("adaptacao")}
                    className="p-3.5 bg-slate-950 hover:bg-slate-850 hover:border-red-500/30 rounded-sm text-left border border-slate-850 transition-all cursor-pointer group flex flex-col"
                  >
                    <div className="flex justify-between items-center w-full">
                      <span className="text-xs font-black text-white font-display uppercase tracking-wider group-hover:text-red-500 transition-colors">Adaptabilidade & Toque</span>
                      <span className="text-[9px] bg-blue-600/15 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-sm uppercase font-mono tracking-wider font-bold">20 Min</span>
                    </div>
                    <span className="text-[11px] text-slate-400 mt-1.5 leading-normal">Foco no controle focado de direita e esquerda. Excelente para iniciar a semana de treinos.</span>
                  </button>

                  <button
                    onClick={() => applyPreset("controle_spin")}
                    className="p-3.5 bg-slate-950 hover:bg-slate-850 hover:border-red-500/30 rounded-sm text-left border border-slate-850 transition-all cursor-pointer group flex flex-col"
                  >
                    <div className="flex justify-between items-center w-full">
                      <span className="text-xs font-black text-white font-display uppercase tracking-wider group-hover:text-red-500 transition-colors">Controle de Efeito</span>
                      <span className="text-[9px] bg-red-650/15 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-sm uppercase font-mono tracking-wider font-bold">35 Min</span>
                    </div>
                    <span className="text-[11px] text-slate-400 mt-1.5 leading-normal">Exercícios de cozinhado, ataque na bola pesada adversária e saques cortantes com spin.</span>
                  </button>

                  <button
                    onClick={() => applyPreset("falkenberg")}
                    className="p-3.5 bg-slate-950 hover:bg-slate-850 hover:border-red-500/30 rounded-sm text-left border border-slate-850 transition-all cursor-pointer group flex flex-col"
                  >
                    <div className="flex justify-between items-center w-full">
                      <span className="text-xs font-black text-white font-display uppercase tracking-wider group-hover:text-red-500 transition-colors">Sistema Falkenberg</span>
                      <span className="text-[9px] bg-amber-600/15 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-sm uppercase font-mono tracking-wider font-bold">40 Min</span>
                    </div>
                    <span className="text-[11px] text-slate-400 mt-1.5 leading-normal">Padrão clássico de movimentação mundial. Aperfeiçoamento intenso do jogo de pernas.</span>
                  </button>
                </div>
              </div>

              {/* Training Tips stats */}
              <div className="bg-slate-900 p-6 rounded-sm border border-slate-800 shadow-xl relative overflow-hidden">
                <div className="flex items-center gap-2 mb-2.5">
                  <Flame className="w-5 h-5 text-red-500 fill-red-500" />
                  <span className="font-display font-black text-sm text-white uppercase tracking-wider">Compromisso do Evoluído</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed font-sans mb-3.5">
                  O segredo da consistência é a repetição consciente. Pratique no mínimo 15-20 minutos de batidas secas contínuas todos os dias para acumular memória muscular no punho.
                </p>
                <div className="flex justify-between items-center text-[10px] font-mono border-t border-slate-800 pt-3 text-slate-500">
                  <span>META DE BATIDAS DIÁRIAS</span>
                  <span className="text-red-500 font-extrabold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping inline-block" />
                    150 REPS
                  </span>
                </div>
              </div>
            </div>

            {/* Custom routine builder and actively tracked list */}
            <div className="lg:col-span-12 xl:col-span-8 flex flex-col gap-6">
              
              <div className="bg-slate-900 p-6 rounded-sm border border-slate-800 shadow-xl relative">
                
                {/* Header tracker */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-slate-850 pb-4 mb-5">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 font-mono tracking-widest uppercase block">Ficha de Rotinas do Dia</span>
                    <h2 className="font-display font-black text-2xl text-white mt-0.5 uppercase tracking-tight">Meu Treino Atual</h2>
                  </div>
                  {drills.length > 0 && (
                    <div className="text-xs bg-slate-950 border border-slate-850 text-slate-400 py-1.5 px-3 rounded-sm font-mono font-semibold">
                      Progresso de Conclusão: <span className="text-red-500 font-bold">{drills.filter(d => d.completed).length} de {drills.length}</span> ({(Math.round((drills.filter(d => d.completed).length / drills.length) * 105)) || 0}%)
                    </div>
                  )}
                </div>

                {/* Form to add custom Drill */}
                <form onSubmit={handleAddDrill} className="grid grid-cols-1 md:grid-cols-12 gap-3 mb-6 bg-slate-950 p-4 rounded-sm border border-slate-850">
                  <div className="md:col-span-12 lg:col-span-5">
                    <label className="block text-[9px] font-bold text-slate-500 uppercase font-mono tracking-wider mb-1">Nome do Exercício / Drill</label>
                    <input
                      type="text"
                      placeholder="Ex: Treino de saque lateral curto..."
                      value={customDrillName}
                      onChange={(e) => setCustomDrillName(e.target.value)}
                      className="w-full text-xs bg-slate-900 border border-slate-800 rounded-sm py-2 px-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500"
                    />
                  </div>

                  <div className="md:col-span-6 lg:col-span-3">
                    <label className="block text-[9px] font-bold text-slate-500 uppercase font-mono tracking-wider mb-1">Duração (Minutos)</label>
                    <input
                      type="number"
                      min="5"
                      max="120"
                      value={customDrillMin}
                      onChange={(e) => setCustomDrillMin(parseInt(e.target.value, 10))}
                      className="w-full text-xs bg-slate-900 border border-slate-800 rounded-sm py-2 px-3 text-slate-200 focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500"
                    />
                  </div>

                  <div className="md:col-span-6 lg:col-span-2">
                    <label className="block text-[9px] font-bold text-slate-500 uppercase font-mono tracking-wider mb-1">Categoria</label>
                    <select
                      value={customDrillCat}
                      onChange={(e: any) => setCustomDrillCat(e.target.value)}
                      className="w-full text-xs bg-slate-900 border border-slate-800 rounded-sm py-2 px-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 cursor-pointer"
                    >
                      <option value="fundamento">Básico</option>
                      <option value="agilidade">Passada</option>
                      <option value="efeito">Efeito</option>
                      <option value="saque">Saque</option>
                    </select>
                  </div>

                  <div className="md:col-span-12 lg:col-span-2 flex items-end">
                    <button
                      type="submit"
                      className="w-full py-2.5 bg-red-650 bg-red-650 bg-red-600 hover:bg-red-500 text-white font-bold rounded-sm text-xs uppercase tracking-wider leading-none flex items-center justify-center gap-1.5 transition-colors shadow cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      Inserir
                    </button>
                  </div>
                </form>

                {/* Drill Lists wrapper */}
                {drills.length === 0 ? (
                  <div className="py-12 px-4 text-center border border-dashed border-slate-800 rounded-sm bg-slate-950">
                    <h3 className="text-white font-display font-black text-xs uppercase tracking-widest mb-1.5">Sua rotina está livre hoje</h3>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4 leading-relaxed">
                      Selecione um dos modelos prontos recomendados à esquerda, ou insira as metas personalizadas de treino acima para registrar progresso.
                    </p>
                    <div className="flex justify-center gap-2">
                      <button 
                         type="button"
                        onClick={() => applyPreset("adaptacao")} 
                        className="py-1.5 px-3 bg-slate-900 border border-slate-800 rounded-sm text-xs font-bold text-slate-350 hover:text-red-500 hover:border-red-500/30 transition-all cursor-pointer"
                      >
                        Aplicar Rotina Básica
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {drills.map((drill) => (
                      <div
                        key={drill.id}
                        className={`flex justify-between items-center p-3.5 rounded-sm border transition-all ${
                          drill.completed
                            ? "bg-slate-950/40 border-slate-850/60 opacity-50"
                            : "bg-slate-950 border-slate-850 hover:bg-slate-900/60"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => toggleDrill(drill.id)}
                            className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all cursor-pointer ${
                              drill.completed
                                ? "bg-red-600 border-red-600 text-white"
                                : "border-slate-800 hover:border-red-500 bg-slate-900"
                            }`}
                          >
                            {drill.completed && <Check className="w-3.5 h-3.5 text-white" />}
                          </button>

                          <div>
                            <span className={`text-xs md:text-sm font-bold block ${drill.completed ? "line-through text-slate-500 font-medium" : "text-white"}`}>
                              {drill.name}
                            </span>
                            <div className="flex gap-2.5 items-center mt-1">
                              <span className={`text-[8.5px] px-2 py-0.5 rounded-sm font-mono tracking-widest uppercase border ${getCategoryColor(drill.category)}`}>
                                {drill.category}
                              </span>
                              <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                                <Clock className="w-3 h-3 text-slate-500" /> {drill.duration} minutos
                              </span>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => deleteDrill(drill.id)}
                          className="p-1.5 text-slate-500 hover:text-red-500 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === "ia" && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-8"
          >
            {/* Quick pre-baked doubt pills list */}
            <div className="lg:col-span-12 xl:col-span-4 flex flex-col gap-6">
              <div className="bg-slate-900 p-6 rounded-sm border border-slate-800 shadow-xl">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-5 h-5 text-red-500 fill-red-500" />
                  <h3 className="font-display font-black text-lg text-white uppercase tracking-tight">Perguntas Comuns</h3>
                </div>
                <p className="text-xs text-slate-400 mb-4 font-sans leading-relaxed">
                  Para os iniciantes, escolher as borrachas, entender o topspin ou lidar com recepções tensas pode assustar. Clique em uma dúvida para ter mentoria imediata:
                </p>

                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => handleSendMessage("Como começar a treinar sozinho em casa sem mesa oficial?")}
                    className="p-3 bg-slate-950 hover:bg-slate-850 hover:border-red-500/30 text-xs text-slate-300 hover:text-white rounded-sm transition-all cursor-pointer font-sans leading-relaxed text-left border border-slate-850"
                  >
                    🏠 Treinar tênis de mesa sozinho em casa
                  </button>

                  <button
                    onClick={() => handleSendMessage("Qual a melhor borracha para iniciantes: lisa, pino curto ou longo?")}
                    className="p-3 bg-slate-950 hover:bg-slate-850 hover:border-red-500/30 text-xs text-slate-300 hover:text-white rounded-sm transition-all cursor-pointer font-sans leading-relaxed text-left border border-slate-850"
                  >
                    🏸 Qual o tipo de borracha ideal para começar?
                  </button>

                  <button
                    onClick={() => handleSendMessage("Dicas do Técnico para devolver saques com efeito cortado para baixo pesado")}
                    className="p-3 bg-slate-950 hover:bg-slate-850 hover:border-red-500/30 text-xs text-slate-300 hover:text-white rounded-sm transition-all cursor-pointer font-sans leading-relaxed text-left border border-slate-850"
                  >
                    🌀 Como devolver saque com efeito muito pesado?
                  </button>

                  <button
                    onClick={() => handleSendMessage("Qual a regra básica de saque no tênis de mesa?")}
                    className="p-3 bg-slate-950 hover:bg-slate-850 hover:border-red-500/30 text-xs text-slate-300 hover:text-white rounded-sm transition-all cursor-pointer font-sans leading-relaxed text-left border border-slate-850"
                  >
                    📖 Principais regras de saque e pontuação
                  </button>
                </div>
              </div>

              {/* Coach status information card */}
              <div className="bg-slate-900 text-white p-6 rounded-sm border border-slate-800 shadow-xl relative overflow-hidden">
                <div className="flex items-center gap-2.5 mb-2.5">
                  <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-ping" />
                  <span className="text-xs font-bold text-red-500 font-mono tracking-wider uppercase">Canarinho GPT Ativo</span>
                </div>
                <h4 className="font-display font-black text-sm text-white uppercase tracking-wider">Mentoria Conversacional</h4>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed font-sans">
                  Desenvolvido com o modelo de IA <span className="font-mono text-slate-200 bg-slate-950 px-1.5 py-0.5 rounded-sm border border-slate-850">gemini-3.5-flash</span> para dar orientações biomecânicas instantâneas.
                </p>
              </div>
            </div>

            {/* Main Active Chat Area */}
            <div className="lg:col-span-12 xl:col-span-8 flex flex-col h-[520px] bg-slate-900 rounded-sm border border-slate-800 shadow-xl overflow-hidden">
              {/* Chat Title bar */}
              <div className="bg-slate-950 p-4 border-b border-slate-850 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 bg-red-500/10 rounded-full border border-red-500/30 flex items-center justify-center text-sm">
                    🇧🇷
                  </div>
                  <div>
                    <span className="font-display font-black tracking-wide text-xs uppercase text-white block">Técnico Canarinho (Treinador IA)</span>
                    <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-semibold">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" /> Pronto para ajudar
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMessages([
                    {
                      role: "assistant",
                      text: "Mesa limpa, parceiro! Nova sessão iniciada. Qual fundamento ou tática de tênis de mesa vamos aperfeiçoar hoje?"
                    }
                  ])}
                  className="text-[10px] text-slate-500 hover:text-red-500 transition-colors uppercase font-mono font-bold tracking-wider cursor-pointer"
                >
                  Limpar Chat
                </button>
              </div>

              {/* Chat Display messages list */}
              <div className="flex-grow p-4 overflow-y-auto bg-slate-950 flex flex-col gap-4">
                {messages.map((msg, index) => (
                  <div
                    key={index}
                    className={`flex flex-col max-w-[85%] ${
                      msg.role === "user" ? "self-end items-end" : "self-start items-start"
                    }`}
                  >
                    <div
                      className={`p-3.5 rounded-sm text-xs md:text-sm shadow-md whitespace-pre-line leading-relaxed ${
                        msg.role === "user"
                          ? "bg-red-650 bg-red-600 text-white"
                          : "bg-slate-900 text-slate-300 border border-slate-850"
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}

                {isSending && (
                  <div className="self-start items-start max-w-[85%] flex gap-2 items-center text-slate-400 font-mono text-[10px] p-2.5 bg-slate-900 rounded-sm border border-slate-850 shadow-md">
                    {/* Bounding paddle loader animation */}
                    <div className="flex space-x-1 shrink-0 pb-0.5">
                      <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-bounce" />
                      <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-100" />
                      <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-bounce delay-200" />
                    </div>
                    <span>Técnico Canarinho está formulando feedback...</span>
                  </div>
                )}

                {errorChat && (
                  <div className="text-center py-2 px-4 bg-red-950/20 border border-red-500/30 text-red-400 text-xs rounded-sm font-medium max-w-md mx-auto">
                    ⚠️ {errorChat}
                  </div>
                )}
                <div ref={chatBottomRef} />
              </div>

              {/* Input Chat form */}
              <div className="p-3 bg-slate-950 border-t border-slate-850">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="flex gap-2"
                >
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Envie sua dúvida para o Técnico Canarinho..."
                    className="flex-grow text-xs md:text-sm bg-slate-900 border border-slate-800 rounded-sm py-2.5 px-4 focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 text-white placeholder-slate-500"
                    disabled={isSending}
                  />
                  <button
                    type="submit"
                    className="p-2.5 bg-red-650 bg-red-600 hover:bg-red-500 text-white rounded-sm flex items-center justify-center transition-all shadow disabled:opacity-50 cursor-pointer"
                    disabled={isSending || !inputValue.trim()}
                  >
                    <Send className="w-4 h-4 text-white" />
                  </button>
                </form>
              </div>

            </div>
          </motion.div>
        )}

      </main>

      {/* FOOTER */}
      <footer id="footer-section" className="bg-slate-950 text-slate-400 text-xs border-t border-slate-850 py-8 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="font-display font-black text-white">EVOLUA<span className="text-red-500 font-semibold">TM</span></span>
            <span className="text-[10px] text-slate-600 font-mono">| © 2026</span>
          </div>
          <div className="flex gap-4 text-[10px] uppercase font-mono font-bold tracking-wider">
            <span className="text-slate-400 hover:text-red-500 transition-colors cursor-pointer">Segurança do Treino</span>
            <span>•</span>
            <span className="text-slate-400 hover:text-red-500 transition-colors cursor-pointer">Regulamento ITTF</span>
            <span>•</span>
            <span className="text-slate-400 hover:text-red-500 transition-colors cursor-pointer">Parceiros</span>
          </div>
          <div>
            <span className="text-[10px] font-mono bg-red-500/10 text-red-400 py-1.5 px-2.5 rounded-sm border border-red-500/20">
              Mesa de Alto Rendimento 🏓 Academy
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
