const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "10kb" })); // Payload limit

// SECURITY: HTML escape function (XSS prevention)
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    };
    return text.replace(/[&<>"']/g, char => map[char]);
}

// SECURITY: Input validation middleware
const validateMessage = (req, res, next) => {
    const message = req.body?.message?.trim();
    if (!message || message.length === 0) {
        return res.status(400).json({ reply: "Ergaa barreessii. Dogoggora!" });
    }
    if (message.length > 1000) {
        return res.status(400).json({ reply: "Ergaa dheeraa dha. Kaffaltii gabaabaa jetti." });
    }
    req.body.message = message;
    next();
};

// 1. FUULA FUULDURAA (HTML)
app.get("/", (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="om">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Kalid AI Pro</title>
    <meta name="description" content="Kalid AI Pro - Afaan Oromoo ChatBot">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: #0f172a; color: white; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; display: flex; flex-direction: column; height: 100vh; }
        header { background: #1e293b; padding: 15px; text-align: center; border-bottom: 3px solid #10b981; box-shadow: 0 4px 10px rgba(0,0,0,0.3); }
        h1 { color: #10b981; font-size: 22px; font-weight: 600; }
        #chat { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 12px; }
        .msg { max-width: 85%; padding: 12px 16px; border-radius: 15px; font-size: 16px; line-height: 1.5; word-wrap: break-word; animation: fadeIn 0.3s ease-in; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .user { align-self: flex-end; background: #10b981; color: white; border-bottom-right-radius: 2px; }
        .ai { align-self: flex-start; background: #334155; color: white; border-bottom-left-radius: 2px; }
        .error { align-self: flex-start; background: #dc2626; color: white; border-bottom-left-radius: 2px; }
        .loading { align-self: flex-start; background: #475569; color: white; border-bottom-left-radius: 2px; }
        .input-box { background: #1e293b; padding: 20px; display: flex; gap: 10px; border-top: 1px solid #334155; }
        input { flex: 1; padding: 12px; border-radius: 8px; border: 1px solid #334155; outline: none; font-size: 16px; background: #0f172a; color: white; transition: border-color 0.2s; }
        input:focus { border-color: #10b981; }
        button { background: #10b981; color: white; border: none; padding: 12px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; transition: 0.2s; }
        button:hover:not(:disabled) { background: #059669; transform: scale(1.02); }
        button:disabled { background: #475569; cursor: not-allowed; opacity: 0.6; }
    </style>
</head>
<body>
    <header><h1>🤖 Kalid AI Pro</h1></header>
    <div id="chat"><div class="msg ai">Akkam, ani Kalid AI Pro dha. Maal siin gargaaru?</div></div>
    <div class="input-box">
        <input type="text" id="msgIn" placeholder="Ergaa barreessi..." autocomplete="off" maxlength="1000">
        <button id="btn" onclick="send()">Ergi</button>
    </div>
    <script>
        const chat = document.getElementById("chat");
        const input = document.getElementById("msgIn");
        const btn = document.getElementById("btn");
        let isLoading = false;

        function escapeHtml(text) {
            const map = {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
            };
            return text.replace(/[&<>"']/g, char => map[char]);
        }

        async function send() {
            if (isLoading) return;
            
            const text = input.value.trim();
            if(!text) {
                alert("Ergaa barreessii!");
                return;
            }

            isLoading = true;
            btn.disabled = true;

            // Add user message
            chat.innerHTML += '<div class="msg user">' + escapeHtml(text) + '</div>';
            input.value = "";
            chat.scrollTop = chat.scrollHeight;

            // Add loading message
            const loadingId = "loading_" + Date.now();
            chat.innerHTML += '<div class="msg loading" id="' + loadingId + '">⏳ Jennoo qabaa...</div>';
            chat.scrollTop = chat.scrollHeight;

            try {
                const res = await fetch("/api/chat", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ message: text }),
                    timeout: 25000
                });

                if (!res.ok) {
                    throw new Error("API Error: " + res.status);
                }

                const data = await res.json();
                
                // Remove loading message
                const loadingEl = document.getElementById(loadingId);
                if (loadingEl) loadingEl.remove();

                // Add AI response
                chat.innerHTML += '<div class="msg ai">' + escapeHtml(data.reply || "Dogoggora uumameera.") + '</div>';
            } catch (e) {
                const loadingEl = document.getElementById(loadingId);
                if (loadingEl) loadingEl.remove();
                chat.innerHTML += '<div class="msg error">❌ Dogoggora: ' + escapeHtml(e.message) + '</div>';
            } finally {
                isLoading = false;
                btn.disabled = false;
                chat.scrollTop = chat.scrollHeight;
            }
        }

        input.addEventListener("keypress", (e) => { 
            if(e.key === "Enter" && !isLoading) send(); 
        });
    </script>
</body>
</html>
    `);
});

// 2. BACKEND API
app.post("/api/chat", validateMessage, async (req, res) => {
    // Set timeout for Vercel (30s max)
    res.setTimeout(25000, () => {
        res.status(408).json({ reply: "Yeroon isqubxu. Irra deebi'ii qorachuuf yaali." });
    });

    try {
        if (!process.env.OPENAI_API_KEY) {
            return res.status(500).json({ reply: "Dogoggora server: API key hin argamne." });
        }

        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + process.env.OPENAI_API_KEY
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                max_tokens: 500,
                temperature: 0.7,
                messages: [
                    { 
                        role: "system", 
                        content: "Ati Kalid AI Pro dha. Afaan Oromoo qofaan deebii gabaabaa kenni. Alaaba maal hin deebiin." 
                    },
                    { 
                        role: "user", 
                        content: req.body.message 
                    }
                ]
            })
        });

        if (!response.ok) {
            const error = await response.json();
            console.error("OpenAI Error:", error);
            return res.status(500).json({ 
                reply: "Dhiifama, OpenAI API dogoggora!" 
            });
        }

        const data = await response.json();
        
        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
            return res.status(500).json({ 
                reply: "Dogoggora: Deebii calaaqee hin argamne." 
            });
        }

        res.json({ reply: data.choices[0].message.content });
    } catch (e) {
        console.error("Error:", e.message);
        res.status(500).json({ 
            reply: "Dhiifama, dogoggora server! " + (e.message || "").substring(0, 50)
        });
    }
});

// Health check endpoint
app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: "Karaa hin argamne" });
});

// Error handler
app.use((err, req, res, next) => {
    console.error("Unhandled error:", err);
    res.status(500).json({ reply: "Dogoggora server!" });
});

// Vercel koodii kana akka dubbisuuf export godhi
module.exports = app;

// Local testing
const PORT = process.env.PORT || 5000;
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`🚀 Kalid AI Pro hojjechaa jira port ${PORT} irratti...`);
    });
}
