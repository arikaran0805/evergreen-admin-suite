import { useEffect, useRef } from "react";

const EmojiBackground = () => {
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const emojis = ["📚", "😊", "🎓", "✨", "💡", "🌟", "📖", "🎯", "🚀", "💪"];
    const container = canvasRef.current;

    if (!container) return;

    // Clear existing emojis
    container.innerHTML = "";

    // Create floating emojis
    for (let i = 0; i < 30; i++) {
      const emoji = document.createElement("div");
      emoji.textContent = emojis[Math.floor(Math.random() * emojis.length)];
      emoji.className = "absolute text-4xl opacity-20 pointer-events-none";
      emoji.style.left = `${Math.random() * 100}%`;
      emoji.style.top = `${Math.random() * 100}%`;
      emoji.style.animation = `float ${5 + Math.random() * 5}s ease-in-out infinite`;
      emoji.style.animationDelay = `${Math.random() * 3}s`;
      container.appendChild(emoji);
    }
  }, []);

  return (
    <>
      <div
        ref={canvasRef}
        className="fixed inset-0 overflow-hidden pointer-events-none z-0"
      />
      <style>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0) rotate(0deg);
          }
          50% {
            transform: translateY(-20px) rotate(5deg);
          }
        }
      `}</style>
    </>
  );
};

export default EmojiBackground;
