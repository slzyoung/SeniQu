import { ApiProperty } from "@nestjs/swagger"
import { IsString, IsNotEmpty, IsOptional, IsIn, MaxLength, Matches } from "class-validator"

export class WalletLoginDto {
    @ApiProperty({ description: "Wallet public address (Solana base58 or Ethereum 0x-hex)" })
    @IsString()
    @IsNotEmpty()
    @MaxLength(44, { message: "Wallet address too long" }) // Solana max: 44, Ethereum: 42
    walletAddress: string

    @ApiProperty({ description: "Signed nonce message (base64 for Solana, 0x-hex for Ethereum)" })
    @IsString()
    @IsNotEmpty()
    @MaxLength(200, { message: "Signature too long" }) // Base64 ed25519 ~88 chars, hex secp256k1 ~132 chars
    signature: string

    @ApiProperty({ description: "Nonce from /wallet/nonce endpoint (64 hex chars)" })
    @IsString()
    @IsNotEmpty()
    @MaxLength(64, { message: "Nonce too long" })
    @Matches(/^[a-f0-9]+$/i, { message: "Invalid nonce format" })
    nonce: string

    @ApiProperty({ description: "Blockchain chain", default: "solana" })
    @IsOptional()
    @IsString()
    @IsIn(["solana", "ethereum"])
    chain?: string = "solana"
}
