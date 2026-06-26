

export interface ModerationResult {
    isAppropriate: boolean
    reason: string
}

/**
 * Utility function to moderate image or video frame/thumbnail content using Gemini Vision API.
 * Standardizes content screening across the platform (AI outputs, forum, reels).
 */
export async function moderateContent(
    buffer: Buffer,
    mimeType: string,
    geminiApiKey: string,
    logger: { error: (msg: string, stack?: string) => void; log: (msg: string) => void; warn: (msg: string) => void }
): Promise<ModerationResult> {
    try {
        if (!geminiApiKey) {
            logger.warn("⚠️ Gemini API Key not set, skipping content moderation.")
            return { isAppropriate: true, reason: "Gemini API Key not set, skipped moderation." }
        }

        const base64Data = buffer.toString("base64")
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    contents: [
                        {
                            parts: [
                                {
                                    text: "Analyze the provided image/frame. Determine if it is appropriate for a public gallery, discussion forum, and media sharing platform. The content must NOT contain any NSFW content, nudity, sexually suggestive poses, explicit pornography, extreme violence, gore, hate speech, weapons, or illegal activities. Respond ONLY with a JSON object containing keys: isAppropriate (boolean), and reason (string describing the analysis in English)."
                                },
                                {
                                    inlineData: {
                                        mimeType: mimeType,
                                        data: base64Data,
                                    }
                                }
                            ]
                        }
                    ],
                    generationConfig: {
                        responseMimeType: "application/json"
                    }
                })
            }
        )

        if (!response.ok) {
            const errText = await response.text()
            logger.error(`Gemini Moderation API error (status ${response.status}): ${errText}`)
            return { isAppropriate: true, reason: "API call failed, bypassing moderation." }
        }

        const result = await response.json() as any
        const textResponse = result?.candidates?.[0]?.content?.parts?.[0]?.text

        if (!textResponse) {
            throw new Error("Empty response from Gemini Moderation API.")
        }

        const parsed = JSON.parse(textResponse.trim())
        return {
            isAppropriate: typeof parsed.isAppropriate === "boolean" ? parsed.isAppropriate : true,
            reason: parsed.reason || "",
        }
    } catch (err: any) {
        logger.error(`Content moderation failed: ${err.message}`, err.stack)
        return { isAppropriate: true, reason: "Error in moderation processing." }
    }
}
