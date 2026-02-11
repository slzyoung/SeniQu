import { IsString, IsNotEmpty, IsEnum, MinLength, MaxLength } from "class-validator"
import { ApiProperty } from "@nestjs/swagger"

export class VerifySignatureDto {
    @ApiProperty({
        description: "Wallet address that signed the message",
        example: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
    })
    @IsString()
    @IsNotEmpty({ message: "Wallet address is required" })
    @MinLength(32, { message: "Invalid wallet address format" })
    @MaxLength(66, { message: "Invalid wallet address format" })
    walletAddress: string

    @ApiProperty({
        description: "Cryptographic signature of the nonce message",
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
    @MinLength(16, { message: "Invalid nonce format" })
    @MaxLength(128, { message: "Nonce too long" })
    nonce: string

    @ApiProperty({
        description: "Blockchain network",
        enum: ["solana", "ethereum", "polygon"],
        default: "solana",
    })
    @IsString()
    @IsEnum(["solana", "ethereum", "polygon"], { message: "Chain must be solana, ethereum, or polygon" })
    chain: "solana" | "ethereum" | "polygon"
}
