import { ApiProperty } from "@nestjs/swagger"
import { IsString, IsNotEmpty, IsOptional, IsIn } from "class-validator"

export class WalletLoginDto {
    @ApiProperty({ description: "Wallet public address" })
    @IsString()
    @IsNotEmpty()
    walletAddress: string

    @ApiProperty({ description: "Signed nonce message (base64)" })
    @IsString()
    @IsNotEmpty()
    signature: string

    @ApiProperty({ description: "Nonce from /wallet/nonce endpoint" })
    @IsString()
    @IsNotEmpty()
    nonce: string

    @ApiProperty({ description: "Blockchain chain", default: "solana" })
    @IsOptional()
    @IsString()
    @IsIn(["solana", "ethereum"])
    chain?: string = "solana"
}
