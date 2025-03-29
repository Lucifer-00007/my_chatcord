const VOICE_API_CONFIG = {
    defaultVoiceTypes: [
        { id: "female", name: "Female" },
        { id: "male", name: "Male" },
        { id: "neutral", name: "Neutral" }
    ],
    voiceProviders: {
        kokoro: {
            name: "Kokoro TTS",
            voiceKey: 'voice',
            textKey: 'input',
            speedKey: 'speed',
            modelKey: 'model',
            formatKey: 'response_format',
            defaults: {
                model: "kokoro",
                response_format: "mp3",
                speed: 1.0
            }
        },
        deepgram: {
            name: "Deepgram",
            voiceKey: 'model',
            textKey: 'text',
            defaults: {
                model: "aura-arcas-en"
            }
        },
        ttsmp3: {
            name: "TTS MP3",
            voiceKey: 'lang',
            textKey: 'msg',
            speedKey: 'speed',
            sourceKey: 'source',
            defaults: {
                source: "ttsmp3",
                speed: "1.00"
            }
        },
        tiktok: {
            name: "TikTok TTS",
            voiceKey: 'voice',
            textKey: 'text',
            defaults: {
                voice: "en_us_rocket"
            }
        },
        hearing: {
            name: "Hearing API",
            requiresAuth: true,
            voiceKey: 'voice',
            textKey: 'text'
        }
    }
};
