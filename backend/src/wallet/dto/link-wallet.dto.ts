import { IsString, IsNotEmpty, IsEnum, IsOptional, MinLength, MaxLength } from "class-validator"
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger"

export class LinkWalletDto {
    @ApiProperty({
        description: "Wallet address to link to account",
        example: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
    })
    @IsString()
    @IsNotEmpty({ message: "Wallet address is required" })
    @MinLength(32, { message: "Invalid wallet address format" })
    @MaxLength(66, { message: "Invalid wallet address format" })
    walletAddress: string

    @ApiProperty({
        description: "Blockchain network",
        enum: ["solana", "ethereum", "polygon"],
        default: "solana",
    })
    @IsString()
    @IsEnum(["solana", "ethereum", "polygon"], { message: "Chain must be solana, ethereum, or polygon" })
    chain: "solana" | "ethereum" | "polygon"

    @ApiProperty({
        description: "Wallet provider",
        enum: ["embedded", "phantom", "solflare", "metamask", "walletconnect", "backpack", "coinbase", "other"],
        default: "phantom",
    })
    @IsString()
    @IsEnum(
        ["embedded", "phantom", "solflare", "metamask", "walletconnect", "backpack", "coinbase", "other"],
        { message: "Invalid wallet provider" },
    )
    provider: string

    @ApiProperty({
        description: "Cryptographic signature proving wallet ownership",
    })
    @IsString()
    @IsNotEmpty({ message: "Signature is required" })
    @MinLength(64, { message: "Invalid signature format" })
    @MaxLength(512, { message: "Signature too long" })
    signature: string

    @ApiProperty({
        description: "The nonce that was signed",
    })
    @IsString()
    @IsNotEmpty({ message: "Nonce is required" })
    nonce: string

    @ApiPropertyOptional({
        description: "User-defined label for this wallet",
        example: "My Phantom",
    })
    @IsOptional()
    @IsString()
    @MaxLength(100, { message: "Label too long" })
    label?: string

    @ApiPropertyOptional({
        description: "Whether this should be the primary wallet",
    })
    @IsOptional()
    isPrimary?: boolean

    @ApiPropertyOptional({
        description: "Whether this is a Privy embedded wallet",
    })
    @IsOptional()
    isEmbedded?: boolean
}
