

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
        const modelsToTry = ['gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash']
        let response: Response | null = null
        let lastErrText = ''

        for (const model of modelsToTry) {
            try {
                const res = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`,
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
                if (res.ok) {
                    response = res
                    break
                } else {
                    lastErrText = await res.text()
                    logger.warn(`Gemini Moderation model ${model} failed (status ${res.status}): ${lastErrText.substring(0, 150)}`)
                }
            } catch (e: any) {
                lastErrText = e.message
            }
        }

        if (!response || !response.ok) {
            logger.error(`Gemini Moderation API error across models: ${lastErrText}`)
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
