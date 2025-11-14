module chat::chat {
    // === Imports ===
    use sui::object::{Self as object, ID, UID};
    use sui::event;
    use sui::transfer;
    use sui::tx_context::TxContext;
    use std::string::{Self as string, String};
    use std::vector;
    use std::option::{Self as option, Option};
    use sui::table::{Self as table, Table};
    use sui::clock::{Self as clock, Clock};
    use sui::bag::{Self as bag, Bag};

    // === Errors ===
    const ENameTooShort: u64 = 0;
    const ENameTooLong: u64 = 1;
    const EProfileAlreadyExists: u64 = 2;
    const EUnauthorized: u64 = 3;
    const EProfileNotFound: u64 = 4;
    const EInvalidString: u64 = 5;
    const ERoomNameTooShort: u64 = 6;
    const ERoomNameTooLong: u64 = 7;
    const ERoomDescriptionTooLong: u64 = 8;
    const ERoomNotFound: u64 = 9;
    const EMessageTooShort: u64 = 10;
    const EMessageTooLong: u64 = 11;
    const ENotInRoom: u64 = 12;
    const EUsernameAlreadyTaken: u64 = 13;
    const EMemberCountDesync: u64 = 14;

    // === Constants ===
    const MIN_NAME_LENGTH: u64 = 3;
    const MAX_NAME_LENGTH: u64 = 50;
    const MIN_ROOM_NAME_LENGTH: u64 = 1;
    const MAX_ROOM_NAME_LENGTH: u64 = 100;
    const MAX_ROOM_DESCRIPTION_LENGTH: u64 = 500;
    const MIN_MESSAGE_LENGTH: u64 = 1;
    const MAX_MESSAGE_LENGTH: u64 = 2000;

    // === Structs ===
    /// Registry để track profiles theo address
    public struct ProfileRegistry has key, store {
        id: UID,
        profiles: Table<address, ID>,
        usernames: Table<String, address>, // username (lowercase) -> address để check uniqueness
    }

    /// Registry để track rooms
    /// Map: room_id -> Room metadata
    public struct RoomRegistry has key, store {
        id: UID,
        rooms: Table<ID, bool>, // room_id -> exists (placeholder)
        room_count: u64, // Tổng số rooms
    }

    /// Registry để track messages trong rooms
    /// Map: room_id -> Bag<message_id>
    public struct MessageRegistry has key, store {
        id: UID,
        messages_by_room: Table<ID, Bag>, // room_id -> Bag<message_id>
        message_counts: Table<ID, u64>, // room_id -> message_count
    }

    /// Registry để track members trong rooms
    /// Map: room_id -> Table<user_address, bool>
    public struct RoomMemberRegistry has key, store {
        id: UID,
        members_by_room: Table<ID, Table<address, bool>>, // room_id -> (user_address -> true)
        member_counts: Table<ID, u64>, // room_id -> member_count
    }

    /// User profile struct
    public struct UserProfile has key {
        id: UID,
        owner: address,
        username: String,
        created_at: u64,
        updated_at: u64,
    }

    /// Room struct
    public struct Room has key, store {
        id: UID,
        name: String,
        description: String,
        creator: address,
        created_at: u64,
        updated_at: u64,
        member_count: u64, // Số lượng members trong room
    }

    /// Message struct
    public struct Message has key, store {
        id: UID,
        room_id: ID,
        author: address,
        content: String,
        created_at: u64,
    }

    // === Structs cho View Functions ===
    public struct ProfileSummary has copy, drop {
        id: ID,
        owner: address,
        username: String,
        created_at: u64,
        updated_at: u64,
    }

    public struct RoomSummary has copy, drop {
        id: ID,
        name: String,
        description: String,
        creator: address,
        created_at: u64,
        updated_at: u64,
        member_count: u64,
    }

    public struct MessageSummary has copy, drop {
        id: ID,
        room_id: ID,
        author: address,
        content: String,
        created_at: u64,
    }

    // === Events ===
    public struct ProfileCreated has copy, drop {
        profile_id: ID,
        owner: address,
        username: String,
    }

    public struct RoomCreated has copy, drop {
        room_id: ID,
        name: String,
        creator: address,
    }

    public struct MessageSent has copy, drop {
        message_id: ID,
        room_id: ID,
        author: address,
    }

    public struct UserJoinedRoom has copy, drop {
        room_id: ID,
        user: address,
    }

    public struct UserLeftRoom has copy, drop {
        room_id: ID,
        user: address,
    }

    // === Init Function ===
    fun init(ctx: &mut TxContext) {
        let profile_registry = ProfileRegistry {
            id: object::new(ctx),
            profiles: table::new(ctx),
            usernames: table::new(ctx),
        };
        transfer::share_object(profile_registry);

        let room_registry = RoomRegistry {
            id: object::new(ctx),
            rooms: table::new(ctx),
            room_count: 0,
        };
        transfer::share_object(room_registry);

        let message_registry = MessageRegistry {
            id: object::new(ctx),
            messages_by_room: table::new(ctx),
            message_counts: table::new(ctx),
        };
        transfer::share_object(message_registry);

        let member_registry = RoomMemberRegistry {
            id: object::new(ctx),
            members_by_room: table::new(ctx),
            member_counts: table::new(ctx),
        };
        transfer::share_object(member_registry);
    }

    // === Helper Functions ===
    /// Kiểm tra string không chỉ chứa whitespace
    fun is_valid_string(s: &String): bool {
        let len = string::length(s);
        if (len == 0) {
            return false
        };
        let bytes = string::as_bytes(s);
        let mut i = 0;
        while (i < len) {
            let byte = *vector::borrow(bytes, i);
            // Nếu tìm thấy ký tự không phải whitespace, string hợp lệ
            if (byte != 32 && byte != 9 && byte != 10 && byte != 13) {
                return true
            };
            i = i + 1;
        };
        false
    }

    /// Chuyển string thành lowercase để check uniqueness
    /// Note: Đây là implementation đơn giản, chỉ xử lý ASCII
    fun to_lowercase(s: &String): String {
        let bytes = string::as_bytes(s);
        let len = vector::length(bytes);
        let mut result = vector::empty<u8>();
        let mut i = 0;
        while (i < len) {
            let byte = *vector::borrow(bytes, i);
            // Chuyển A-Z thành a-z
            if (byte >= 65 && byte <= 90) {
                vector::push_back(&mut result, byte + 32);
            } else {
                vector::push_back(&mut result, byte);
            };
            i = i + 1;
        };
        string::utf8(result)
    }

    // === Public Entry Functions ===
    /// Tạo profile mới cho user
    public entry fun create_profile(
        registry: &mut ProfileRegistry,
        username: String,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let sender = ctx.sender();
        assert!(!table::contains(&registry.profiles, sender), EProfileAlreadyExists);

        let username_len = string::length(&username);
        assert!(username_len >= MIN_NAME_LENGTH, ENameTooShort);
        assert!(username_len <= MAX_NAME_LENGTH, ENameTooLong);
        assert!(is_valid_string(&username), EInvalidString);

        // Kiểm tra username uniqueness (case-insensitive)
        let username_lower = to_lowercase(&username);
        assert!(!table::contains(&registry.usernames, username_lower), EUsernameAlreadyTaken);

        let now = clock::timestamp_ms(clock);
        let profile = UserProfile {
            id: object::new(ctx),
            owner: sender,
            username: username,
            created_at: now,
            updated_at: now,
        };
        let profile_id = object::id(&profile);

        table::add(&mut registry.profiles, sender, profile_id);
        table::add(&mut registry.usernames, username_lower, sender);

        event::emit(ProfileCreated {
            profile_id: profile_id,
            owner: sender,
            username: profile.username,
        });

        transfer::transfer(profile, sender);
    }

    /// Tạo room mới
    public entry fun create_room(
        profile_registry: &ProfileRegistry,
        room_registry: &mut RoomRegistry,
        member_registry: &mut RoomMemberRegistry,
        name: String,
        description: String,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let sender = ctx.sender();
        assert!(table::contains(&profile_registry.profiles, sender), EProfileNotFound);

        let name_len = string::length(&name);
        let desc_len = string::length(&description);
        assert!(name_len >= MIN_ROOM_NAME_LENGTH, ERoomNameTooShort);
        assert!(name_len <= MAX_ROOM_NAME_LENGTH, ERoomNameTooLong);
        assert!(desc_len <= MAX_ROOM_DESCRIPTION_LENGTH, ERoomDescriptionTooLong);
        assert!(is_valid_string(&name), EInvalidString);
        // Cho phép description rỗng hoặc chỉ whitespace (optional field)
        if (desc_len > 0) {
            assert!(is_valid_string(&description), EInvalidString);
        };

        let now = clock::timestamp_ms(clock);
        let mut room = Room {
            id: object::new(ctx),
            name: name,
            description: description,
            creator: sender,
            created_at: now,
            updated_at: now,
            member_count: 0,
        };

        let room_id = object::id(&room);

        // Register room trong room_registry
        table::add(&mut room_registry.rooms, room_id, true);
        room_registry.room_count = room_registry.room_count + 1;

        // Tạo entry cho members trong room này
        let members_table = table::new(ctx);
        table::add(&mut member_registry.members_by_room, room_id, members_table);
        table::add(&mut member_registry.member_counts, room_id, 0);

        // Tự động thêm creator vào room
        let members_table = table::borrow_mut(&mut member_registry.members_by_room, room_id);
        table::add(members_table, sender, true);
        let member_count = table::borrow_mut(&mut member_registry.member_counts, room_id);
        *member_count = *member_count + 1;
        room.member_count = 1;

        event::emit(RoomCreated {
            room_id: room_id,
            name: room.name,
            creator: sender,
        });

        event::emit(UserJoinedRoom {
            room_id: room_id,
            user: sender,
        });

        transfer::share_object(room);
    }

    /// Gửi message vào room
    public entry fun send_message(
        profile_registry: &ProfileRegistry,
        room_registry: &RoomRegistry,
        room: &Room,
        message_registry: &mut MessageRegistry,
        member_registry: &RoomMemberRegistry,
        content: String,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let sender = ctx.sender();
        assert!(table::contains(&profile_registry.profiles, sender), EProfileNotFound);

        let room_id = object::id(room);

        // Kiểm tra room có tồn tại trong registry không
        assert!(table::contains(&room_registry.rooms, room_id), ERoomNotFound);

        // Kiểm tra user có trong room không
        assert!(table::contains(&member_registry.members_by_room, room_id), ERoomNotFound);
        let members_table = table::borrow(&member_registry.members_by_room, room_id);
        assert!(table::contains(members_table, sender), ENotInRoom);

        let content_len = string::length(&content);
        assert!(content_len >= MIN_MESSAGE_LENGTH, EMessageTooShort);
        assert!(content_len <= MAX_MESSAGE_LENGTH, EMessageTooLong);
        assert!(is_valid_string(&content), EInvalidString);

        let now = clock::timestamp_ms(clock);
        let message = Message {
            id: object::new(ctx),
            room_id: room_id,
            author: sender,
            content: content,
            created_at: now,
        };

        let message_id = object::id(&message);

        // Đảm bảo entry tồn tại trong messages_by_room
        if (!table::contains(&message_registry.messages_by_room, room_id)) {
            let messages_bag = bag::new(ctx);
            table::add(&mut message_registry.messages_by_room, room_id, messages_bag);
        };

        // Đảm bảo count entry tồn tại
        if (!table::contains(&message_registry.message_counts, room_id)) {
            table::add(&mut message_registry.message_counts, room_id, 0);
        };

        // Thêm message vào bag
        let messages_bag = table::borrow_mut(&mut message_registry.messages_by_room, room_id);
        bag::add(messages_bag, message_id, true);

        // Update count
        let count = table::borrow_mut(&mut message_registry.message_counts, room_id);
        *count = *count + 1;

        event::emit(MessageSent {
            message_id: message_id,
            room_id: room_id,
            author: sender,
        });

        transfer::transfer(message, sender);
    }

    /// Join vào một room
    public entry fun join_room(
        profile_registry: &ProfileRegistry,
        room: &mut Room,
        member_registry: &mut RoomMemberRegistry,
        ctx: &mut TxContext
    ) {
        let sender = ctx.sender();
        assert!(table::contains(&profile_registry.profiles, sender), EProfileNotFound);

        let room_id = object::id(room);

        // Đảm bảo entry tồn tại
        if (!table::contains(&member_registry.members_by_room, room_id)) {
            let members_table = table::new(ctx);
            table::add(&mut member_registry.members_by_room, room_id, members_table);
        };

        let members_table = table::borrow_mut(&mut member_registry.members_by_room, room_id);
        
        // Kiểm tra đã join chưa
        if (table::contains(members_table, sender)) {
            return // Đã join rồi, không cần làm gì
        };

        // Thêm member
        table::add(members_table, sender, true);

        // Update count
        if (!table::contains(&member_registry.member_counts, room_id)) {
            table::add(&mut member_registry.member_counts, room_id, 0);
        };
        let count = table::borrow_mut(&mut member_registry.member_counts, room_id);
        *count = *count + 1;
        room.member_count = room.member_count + 1;

        event::emit(UserJoinedRoom {
            room_id: room_id,
            user: sender,
        });
    }

    /// Leave khỏi một room
    public entry fun leave_room(
        room: &mut Room,
        member_registry: &mut RoomMemberRegistry,
        ctx: &mut TxContext
    ) {
        let sender = ctx.sender();
        let room_id = object::id(room);

        // Kiểm tra entry tồn tại
        if (!table::contains(&member_registry.members_by_room, room_id)) {
            return // Không có trong room
        };

        let members_table = table::borrow_mut(&mut member_registry.members_by_room, room_id);
        
        // Kiểm tra có trong room không
        if (!table::contains(members_table, sender)) {
            return // Không có trong room
        };

        // Remove member
        let _value = table::remove(members_table, sender);

        // Update count
        if (table::contains(&member_registry.member_counts, room_id)) {
            let count = table::borrow_mut(&mut member_registry.member_counts, room_id);
            assert!(*count > 0, EMemberCountDesync);
            *count = *count - 1;
            room.member_count = room.member_count - 1;
        };

        event::emit(UserLeftRoom {
            room_id: room_id,
            user: sender,
        });
    }

    /// Cập nhật username
    public entry fun update_username(
        registry: &mut ProfileRegistry,
        profile: &mut UserProfile,
        new_username: String,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        assert!(profile.owner == ctx.sender(), EUnauthorized);
        
        let username_len = string::length(&new_username);
        assert!(username_len >= MIN_NAME_LENGTH, ENameTooShort);
        assert!(username_len <= MAX_NAME_LENGTH, ENameTooLong);
        assert!(is_valid_string(&new_username), EInvalidString);

        // Kiểm tra username uniqueness (case-insensitive)
        let new_username_lower = to_lowercase(&new_username);
        // Nếu username mới khác username cũ (case-insensitive), check uniqueness
        let old_username_lower = to_lowercase(&profile.username);
        if (old_username_lower != new_username_lower) {
            assert!(!table::contains(&registry.usernames, new_username_lower), EUsernameAlreadyTaken);
            // Remove old username
            let _old_owner = table::remove(&mut registry.usernames, old_username_lower);
            // Add new username
            table::add(&mut registry.usernames, new_username_lower, profile.owner);
        };
        
        profile.username = new_username;
        profile.updated_at = clock::timestamp_ms(clock);
    }

    // === View Functions ===
    /// Lấy profile_id từ registry theo address
    public fun get_profile_id_by_address(
        registry: &ProfileRegistry,
        owner: address
    ): ID {
        assert!(table::contains(&registry.profiles, owner), EProfileNotFound);
        *table::borrow(&registry.profiles, owner)
    }

    /// Kiểm tra xem address có profile chưa
    public fun has_profile(
        registry: &ProfileRegistry,
        owner: address
    ): bool {
        table::contains(&registry.profiles, owner)
    }

    /// Lấy toàn bộ thông tin profile
    public fun get_profile_summary(profile: &UserProfile): ProfileSummary {
        ProfileSummary {
            id: object::id(profile),
            owner: profile.owner,
            username: profile.username,
            created_at: profile.created_at,
            updated_at: profile.updated_at,
        }
    }

    /// Lấy toàn bộ thông tin room
    public fun get_room_summary(room: &Room): RoomSummary {
        RoomSummary {
            id: object::id(room),
            name: room.name,
            description: room.description,
            creator: room.creator,
            created_at: room.created_at,
            updated_at: room.updated_at,
            member_count: room.member_count,
        }
    }

    /// Lấy toàn bộ thông tin message
    public fun get_message_summary(message: &Message): MessageSummary {
        MessageSummary {
            id: object::id(message),
            room_id: message.room_id,
            author: message.author,
            content: message.content,
            created_at: message.created_at,
        }
    }

    /// Lấy username từ profile
    public fun get_username(profile: &UserProfile): String {
        profile.username
    }

    /// Lấy room name
    public fun get_room_name(room: &Room): String {
        room.name
    }

    /// Lấy room description
    public fun get_room_description(room: &Room): String {
        room.description
    }

    /// Lấy message content
    public fun get_message_content(message: &Message): String {
        message.content
    }

    /// Lấy số lượng messages trong room
    public fun get_room_message_count(
        message_registry: &MessageRegistry,
        room_id: ID
    ): u64 {
        if (!table::contains(&message_registry.message_counts, room_id)) {
            return 0
        };
        *table::borrow(&message_registry.message_counts, room_id)
    }

    /// Lấy số lượng members trong room
    public fun get_room_member_count(room: &Room): u64 {
        room.member_count
    }

    /// Kiểm tra xem user có trong room không
    public fun is_member_of_room(
        member_registry: &RoomMemberRegistry,
        room_id: ID,
        user: address
    ): bool {
        if (!table::contains(&member_registry.members_by_room, room_id)) {
            return false
        };
        let members_table = table::borrow(&member_registry.members_by_room, room_id);
        table::contains(members_table, user)
    }

    /// Kiểm tra xem message ID có trong room không
    public fun room_has_message(
        message_registry: &MessageRegistry,
        room_id: ID,
        message_id: ID
    ): bool {
        if (!table::contains(&message_registry.messages_by_room, room_id)) {
            return false
        };
        let messages_bag = table::borrow(&message_registry.messages_by_room, room_id);
        bag::contains(messages_bag, message_id)
    }

    /// Lấy tổng số rooms
    public fun get_total_room_count(room_registry: &RoomRegistry): u64 {
        room_registry.room_count
    }

    /// Kiểm tra xem room có tồn tại không
    public fun room_exists(
        room_registry: &RoomRegistry,
        room_id: ID
    ): bool {
        table::contains(&room_registry.rooms, room_id)
    }

    /// Kiểm tra xem username đã được sử dụng chưa (case-insensitive)
    public fun is_username_taken(
        registry: &ProfileRegistry,
        username: String
    ): bool {
        let username_lower = to_lowercase(&username);
        table::contains(&registry.usernames, username_lower)
    }

    /// Lấy address của user từ username (case-insensitive)
    public fun get_address_by_username(
        registry: &ProfileRegistry,
        username: String
    ): Option<address> {
        let username_lower = to_lowercase(&username);
        if (table::contains(&registry.usernames, username_lower)) {
            option::some(*table::borrow(&registry.usernames, username_lower))
        } else {
            option::none()
        }
    }

    #[test_only]
    public fun init_for_testing(ctx: &mut TxContext) {
        init(ctx);
    }
}
