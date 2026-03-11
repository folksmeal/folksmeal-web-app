import "server-only"
import crypto from "crypto"

function getEncryptionKey(): Buffer {
    const rawKey = process.env.AUTH_SECRET || "default_development_secret_do_not_use"
    return crypto.createHash("sha256").update(rawKey).digest()
}

const ALGORITHM = "aes-256-gcm"
const IV_LENGTH = 12

export function encryptText(text: string): string {
    const iv = crypto.randomBytes(IV_LENGTH)
    const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv)

    let encrypted = cipher.update(text, "utf8", "hex")
    encrypted += cipher.final("hex")

    const authTag = cipher.getAuthTag()

    return `${iv.toString("hex")}:${encrypted}:${authTag.toString("hex")}`
}

export function decryptText(encryptedText: string): string | null {
    try {
        if (!encryptedText || !encryptedText.includes(":")) return null

        const parts = encryptedText.split(":")
        if (parts.length !== 3) return null

        const [ivHex, ciphertextHex, authTagHex] = parts

        const iv = Buffer.from(ivHex, "hex")
        const encryptedTextBuffer = Buffer.from(ciphertextHex, "hex")
        const authTag = Buffer.from(authTagHex, "hex")

        const decipher = crypto.createDecipheriv(ALGORITHM, getEncryptionKey(), iv)
        decipher.setAuthTag(authTag)

        let decrypted = decipher.update(encryptedTextBuffer, undefined, "utf8")
        decrypted += decipher.final("utf8")

        return decrypted
    } catch (error) {
        console.error("Failed to decrypt text:", error)
        return null
    }
}
