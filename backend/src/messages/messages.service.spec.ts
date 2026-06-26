import { Test, TestingModule } from '@nestjs/testing';
import { MessagesService } from './messages.service';
import { DatabaseService } from '../database/database.service';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';

describe('MessagesService', () => {
    let service: MessagesService;
    let dbServiceMock: any;
    let supabaseClientMock: any;

    beforeEach(async () => {
        // Mock Supabase Client chain supporting thenables by default
        supabaseClientMock = {
            from: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            insert: jest.fn().mockReturnThis(),
            update: jest.fn().mockReturnThis(),
            delete: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            or: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            single: jest.fn(),
            then: jest.fn().mockImplementation((resolve: any) => resolve({ data: null, error: null })),
        };

        dbServiceMock = {
            getAdminClient: jest.fn().mockReturnValue(supabaseClientMock),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MessagesService,
                {
                    provide: DatabaseService,
                    useValue: dbServiceMock,
                },
            ],
        }).compile();

        service = module.get<MessagesService>(MessagesService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('sendMessage', () => {
        it('should throw BadRequestException if sender attempts to message themselves', async () => {
            await expect(
                service.sendMessage('user-1', {
                    recipientId: 'user-1',
                    encryptedContent: 'cipher',
                    iv: 'iv',
                })
            ).rejects.toThrow(BadRequestException);
        });

        it('should throw NotFoundException if recipient does not exist', async () => {
            supabaseClientMock.single.mockResolvedValueOnce({ data: null }); // recipient check

            await expect(
                service.sendMessage('user-1', {
                    recipientId: 'user-2',
                    encryptedContent: 'cipher',
                    iv: 'iv',
                })
            ).rejects.toThrow(NotFoundException);
        });

        it('should throw ForbiddenException if user is blocked', async () => {
            supabaseClientMock.single
                .mockResolvedValueOnce({ data: { id: 'user-2' } }) // recipient check
                .mockResolvedValueOnce({ data: { id: 'block-id' } }); // block check

            await expect(
                service.sendMessage('user-1', {
                    recipientId: 'user-2',
                    encryptedContent: 'cipher',
                    iv: 'iv',
                })
            ).rejects.toThrow(ForbiddenException);
        });

        it('should successfully send a message and create/find conversation', async () => {
            // Recipient exists, no block, conversation exists, insert message
            supabaseClientMock.single
                .mockResolvedValueOnce({ data: { id: 'user-2', display_name: 'Recipient' } }) // recipient check
                .mockResolvedValueOnce({ data: null }) // block check
                .mockResolvedValueOnce({ data: { id: 'convo-1' } }) // find conversation
                .mockResolvedValueOnce({ // insert message
                    data: {
                        id: 'msg-1',
                        conversation_id: 'convo-1',
                        sender_id: 'user-1',
                        recipient_id: 'user-2',
                        created_at: '2026-06-18T12:00:00Z',
                    },
                    error: null,
                });

            const result = await service.sendMessage('user-1', {
                recipientId: 'user-2',
                encryptedContent: 'cipher',
                iv: 'iv',
                senderPublicKey: 'pubkey',
            });

            expect(result).toEqual({
                id: 'msg-1',
                conversationId: 'convo-1',
                senderId: 'user-1',
                recipientId: 'user-2',
                createdAt: '2026-06-18T12:00:00Z',
            });
        });
    });

    describe('getConversations', () => {
        it('should fetch and map conversations to frontend format', async () => {
            const rawConversations = [
                {
                    id: 'convo-1',
                    participant_a: 'user-1',
                    participant_b: 'user-2',
                    last_message_at: '2026-06-18T12:00:00Z',
                    last_message_preview: '[Encrypted Message]',
                    created_at: '2026-06-18T11:00:00Z',
                    user_a: { id: 'user-1', display_name: 'Me', avatar_url: 'avatar1' },
                    user_b: { id: 'user-2', display_name: 'Photographer', avatar_url: 'avatar2' },
                },
            ];

            // Use thenable to resolve the awaited query chain
            supabaseClientMock.then.mockImplementationOnce((resolve: any) => {
                resolve({
                    data: rawConversations,
                    error: null,
                });
            });

            const result = await service.getConversations('user-1');

            expect(result).toHaveLength(1);
            expect(result[0]).toEqual({
                id: 'convo-1',
                otherUser: {
                    id: 'user-2',
                    displayName: 'Photographer',
                    avatarUrl: 'avatar2',
                },
                lastMessageAt: '2026-06-18T12:00:00Z',
                lastMessagePreview: '[Encrypted Message]',
                createdAt: '2026-06-18T11:00:00Z',
            });
        });
    });

    describe('blockUser / unblockUser', () => {
        it('should block a user successfully', async () => {
            supabaseClientMock.single.mockResolvedValueOnce({ data: null }); // check existing block

            const result = await service.blockUser('user-1', 'user-2');
            expect(result).toEqual({ blocked: true });
        });

        it('should throw BadRequestException when trying to block oneself', async () => {
            await expect(
                service.blockUser('user-1', 'user-1')
            ).rejects.toThrow(BadRequestException);
        });

        it('should unblock a user successfully', async () => {
            const result = await service.unblockUser('user-1', 'user-2');
            expect(result).toEqual({ blocked: false });
        });
    });
});
