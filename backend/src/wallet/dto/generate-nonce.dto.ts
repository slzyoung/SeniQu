import { IsString, IsNotEmpty, IsEnum, Matches, MaxLength, MinLength, IsOptional } from "class-validator"
import { ApiProperty } from "@nestjs/swagger"

export class GenerateNonceDto {
    @ApiProperty({
        description: "Wallet address to generate nonce for",
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
    @ApiProperty({
        description: "Blockchain network",
        enum: ["solana", "ethereum", "polygon"],
        default: "solana",
    })
    @IsString()
    @IsEnum(["solana", "ethereum", "polygon"], { message: "Chain must be solana, ethereum, or polygon" })
    chain: "solana" | "ethereum" | "polygon"

    @ApiProperty({
        description: "Domain where the request originated (for SIWS binding)",
        example: "seniquapp.netlify.app",
        required: false,
    })
    @IsString()
    @IsOptional()
    domain?: string
}
