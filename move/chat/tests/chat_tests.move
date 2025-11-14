#[test_only]
module chat::chat_tests;

use chat::chat;
use sui::test_scenario::{Self as test_scenario, Scenario};
use sui::clock::{Self as clock, Clock};
use sui::tx_context;
use std::string;
use sui::object;

// Test addresses
const ADMIN: address = @0xA;
const USER1: address = @0xB;
const USER2: address = @0xC;
const USER3: address = @0xD;

// === Test Setup ===
fun setup_test(): Scenario {
    let mut scenario_val = test_scenario::begin(ADMIN);
    let scenario = &mut scenario_val;
    chat::init_for_testing(test_scenario::ctx(scenario));
    test_scenario::next_tx(scenario, ADMIN);
    scenario_val
}

fun get_clock(scenario: &mut Scenario): Clock {
    clock::create_for_testing(test_scenario::ctx(scenario))
}

// === Test Profile Creation ===
#[test]
fun test_create_profile_success() {
    let mut scenario = setup_test();
    let clock = get_clock(&mut scenario);
    
    // User1 tạo profile
    test_scenario::next_tx(&mut scenario, USER1);
    {
        let mut profile_registry = test_scenario::take_shared<chat::ProfileRegistry>(&scenario);
        chat::create_profile(&mut profile_registry, string::utf8(b"Alice"), &clock, test_scenario::ctx(&mut scenario));
        test_scenario::return_shared(profile_registry);
    };
    
    // Verify profile được tạo
    test_scenario::next_tx(&mut scenario, USER1);
    {
        let profile_registry = test_scenario::take_shared<chat::ProfileRegistry>(&scenario);
        assert!(chat::has_profile(&profile_registry, USER1), 0);
        let profile_id = chat::get_profile_id_by_address(&profile_registry, USER1);
        test_scenario::return_shared(profile_registry);
        
        // Verify profile object
        let profile = test_scenario::take_from_sender<chat::UserProfile>(&scenario);
        assert!(object::id(&profile) == profile_id, 1);
        assert!(chat::get_username(&profile) == string::utf8(b"Alice"), 2);
        test_scenario::return_to_sender(&scenario, profile);
    };
    
    clock::destroy_for_testing(clock);
    test_scenario::end(scenario);
}

#[test]
#[expected_failure(abort_code = chat::EProfileAlreadyExists)]
fun test_create_profile_twice_fails() {
    let mut scenario = setup_test();
    let clock = get_clock(&mut scenario);
    
    // User1 tạo profile lần 1
    test_scenario::next_tx(&mut scenario, USER1);
    {
        let mut profile_registry = test_scenario::take_shared<chat::ProfileRegistry>(&scenario);
        chat::create_profile(&mut profile_registry, string::utf8(b"Alice"), &clock, test_scenario::ctx(&mut scenario));
        test_scenario::return_shared(profile_registry);
    };
    
    // User1 tạo profile lần 2 - should fail
    test_scenario::next_tx(&mut scenario, USER1);
    {
        let mut profile_registry = test_scenario::take_shared<chat::ProfileRegistry>(&scenario);
        chat::create_profile(&mut profile_registry, string::utf8(b"Bob"), &clock, test_scenario::ctx(&mut scenario));
        test_scenario::return_shared(profile_registry);
    };
    
    clock::destroy_for_testing(clock);
    test_scenario::end(scenario);
}

#[test]
#[expected_failure(abort_code = chat::ENameTooShort)]
fun test_create_profile_username_too_short() {
    let mut scenario = setup_test();
    let clock = get_clock(&mut scenario);
    
    test_scenario::next_tx(&mut scenario, USER1);
    {
        let mut profile_registry = test_scenario::take_shared<chat::ProfileRegistry>(&scenario);
        chat::create_profile(&mut profile_registry, string::utf8(b"AB"), &clock, test_scenario::ctx(&mut scenario));
        test_scenario::return_shared(profile_registry);
    };
    
    clock::destroy_for_testing(clock);
    test_scenario::end(scenario);
}

#[test]
#[expected_failure(abort_code = chat::EUsernameAlreadyTaken)]
fun test_create_profile_username_taken() {
    let mut scenario = setup_test();
    let clock = get_clock(&mut scenario);
    
    // User1 tạo profile với "Alice"
    test_scenario::next_tx(&mut scenario, USER1);
    {
        let mut profile_registry = test_scenario::take_shared<chat::ProfileRegistry>(&scenario);
        chat::create_profile(&mut profile_registry, string::utf8(b"Alice"), &clock, test_scenario::ctx(&mut scenario));
        test_scenario::return_shared(profile_registry);
    };
    
    // User2 tạo profile với "alice" (case-insensitive) - should fail
    test_scenario::next_tx(&mut scenario, USER2);
    {
        let mut profile_registry = test_scenario::take_shared<chat::ProfileRegistry>(&scenario);
        chat::create_profile(&mut profile_registry, string::utf8(b"alice"), &clock, test_scenario::ctx(&mut scenario));
        test_scenario::return_shared(profile_registry);
    };
    
    clock::destroy_for_testing(clock);
    test_scenario::end(scenario);
}

// === Test Room Creation ===
#[test]
fun test_create_room_success() {
    let mut scenario = setup_test();
    let clock = get_clock(&mut scenario);
    
    // Setup: User1 tạo profile
    test_scenario::next_tx(&mut scenario, USER1);
    {
        let mut profile_registry = test_scenario::take_shared<chat::ProfileRegistry>(&scenario);
        chat::create_profile(&mut profile_registry, string::utf8(b"Alice"), &clock, test_scenario::ctx(&mut scenario));
        test_scenario::return_shared(profile_registry);
    };
    
    // User1 tạo room
    test_scenario::next_tx(&mut scenario, USER1);
    {
        let profile_registry = test_scenario::take_shared<chat::ProfileRegistry>(&scenario);
        let mut room_registry = test_scenario::take_shared<chat::RoomRegistry>(&scenario);
        let mut member_registry = test_scenario::take_shared<chat::RoomMemberRegistry>(&scenario);
        
        chat::create_room(
            &profile_registry,
            &mut room_registry,
            &mut member_registry,
            string::utf8(b"General"),
            string::utf8(b"General discussion room"),
            &clock,
            test_scenario::ctx(&mut scenario)
        );
        
        test_scenario::return_shared(profile_registry);
        test_scenario::return_shared(room_registry);
        test_scenario::return_shared(member_registry);
    };
    
    // Verify room được tạo và creator tự động join
    test_scenario::next_tx(&mut scenario, USER1);
    {
        let room_registry = test_scenario::take_shared<chat::RoomRegistry>(&scenario);
        let member_registry = test_scenario::take_shared<chat::RoomMemberRegistry>(&scenario);
        
        // Get room ID từ shared objects (cần lấy từ event hoặc query)
        // For now, verify room_count
        assert!(chat::get_total_room_count(&room_registry) == 1, 0);
        
        test_scenario::return_shared(room_registry);
        test_scenario::return_shared(member_registry);
    };
    
    clock::destroy_for_testing(clock);
    test_scenario::end(scenario);
}

#[test]
#[expected_failure(abort_code = chat::EProfileNotFound)]
fun test_create_room_without_profile_fails() {
    let mut scenario = setup_test();
    let clock = get_clock(&mut scenario);
    
    // User1 tạo room mà không có profile - should fail
    test_scenario::next_tx(&mut scenario, USER1);
    {
        let profile_registry = test_scenario::take_shared<chat::ProfileRegistry>(&scenario);
        let mut room_registry = test_scenario::take_shared<chat::RoomRegistry>(&scenario);
        let mut member_registry = test_scenario::take_shared<chat::RoomMemberRegistry>(&scenario);
        
        chat::create_room(
            &profile_registry,
            &mut room_registry,
            &mut member_registry,
            string::utf8(b"General"),
            string::utf8(b"Description"),
            &clock,
            test_scenario::ctx(&mut scenario)
        );
        
        test_scenario::return_shared(profile_registry);
        test_scenario::return_shared(room_registry);
        test_scenario::return_shared(member_registry);
    };
    
    clock::destroy_for_testing(clock);
    test_scenario::end(scenario);
}

// === Test Join Room ===
#[test]
fun test_join_room_success() {
    let mut scenario = setup_test();
    let clock = get_clock(&mut scenario);
    
    // Setup: User1 và User2 tạo profiles
    test_scenario::next_tx(&mut scenario, USER1);
    {
        let mut profile_registry = test_scenario::take_shared<chat::ProfileRegistry>(&scenario);
        chat::create_profile(&mut profile_registry, string::utf8(b"Alice"), &clock, test_scenario::ctx(&mut scenario));
        test_scenario::return_shared(profile_registry);
    };
    
    test_scenario::next_tx(&mut scenario, USER2);
    {
        let mut profile_registry = test_scenario::take_shared<chat::ProfileRegistry>(&scenario);
        chat::create_profile(&mut profile_registry, string::utf8(b"Bob"), &clock, test_scenario::ctx(&mut scenario));
        test_scenario::return_shared(profile_registry);
    };
    
    // User1 tạo room
    test_scenario::next_tx(&mut scenario, USER1);
    {
        let profile_registry = test_scenario::take_shared<chat::ProfileRegistry>(&scenario);
        let mut room_registry = test_scenario::take_shared<chat::RoomRegistry>(&scenario);
        let mut member_registry = test_scenario::take_shared<chat::RoomMemberRegistry>(&scenario);
        
        chat::create_room(
            &profile_registry,
            &mut room_registry,
            &mut member_registry,
            string::utf8(b"General"),
            string::utf8(b"Description"),
            &clock,
            test_scenario::ctx(&mut scenario)
        );
        
        test_scenario::return_shared(profile_registry);
        test_scenario::return_shared(room_registry);
        test_scenario::return_shared(member_registry);
    };
    
    // User2 join room
    test_scenario::next_tx(&mut scenario, USER2);
    {
        let profile_registry = test_scenario::take_shared<chat::ProfileRegistry>(&scenario);
        let mut member_registry = test_scenario::take_shared<chat::RoomMemberRegistry>(&scenario);
        let mut room = test_scenario::take_shared<chat::Room>(&scenario);
        
        chat::join_room(&profile_registry, &mut room, &mut member_registry, test_scenario::ctx(&mut scenario));
        
        assert!(chat::get_room_member_count(&room) == 2, 0);
        
        test_scenario::return_shared(profile_registry);
        test_scenario::return_shared(member_registry);
        test_scenario::return_shared(room);
    };
    
    clock::destroy_for_testing(clock);
    test_scenario::end(scenario);
}

// === Test Send Message ===
#[test]
fun test_send_message_success() {
    let mut scenario = setup_test();
    let clock = get_clock(&mut scenario);
    
    // Setup: User1 tạo profile và room
    test_scenario::next_tx(&mut scenario, USER1);
    {
        let mut profile_registry = test_scenario::take_shared<chat::ProfileRegistry>(&scenario);
        chat::create_profile(&mut profile_registry, string::utf8(b"Alice"), &clock, test_scenario::ctx(&mut scenario));
        test_scenario::return_shared(profile_registry);
    };
    
    test_scenario::next_tx(&mut scenario, USER1);
    {
        let profile_registry = test_scenario::take_shared<chat::ProfileRegistry>(&scenario);
        let mut room_registry = test_scenario::take_shared<chat::RoomRegistry>(&scenario);
        let mut member_registry = test_scenario::take_shared<chat::RoomMemberRegistry>(&scenario);
        
        chat::create_room(
            &profile_registry,
            &mut room_registry,
            &mut member_registry,
            string::utf8(b"General"),
            string::utf8(b"Description"),
            &clock,
            test_scenario::ctx(&mut scenario)
        );
        
        test_scenario::return_shared(profile_registry);
        test_scenario::return_shared(room_registry);
        test_scenario::return_shared(member_registry);
    };
    
    // User1 gửi message
    test_scenario::next_tx(&mut scenario, USER1);
    {
        let profile_registry = test_scenario::take_shared<chat::ProfileRegistry>(&scenario);
        let room_registry = test_scenario::take_shared<chat::RoomRegistry>(&scenario);
        let room = test_scenario::take_shared<chat::Room>(&scenario);
        let mut message_registry = test_scenario::take_shared<chat::MessageRegistry>(&scenario);
        let member_registry = test_scenario::take_shared<chat::RoomMemberRegistry>(&scenario);
        
        chat::send_message(
            &profile_registry,
            &room_registry,
            &room,
            &mut message_registry,
            &member_registry,
            string::utf8(b"Hello, world!"),
            &clock,
            test_scenario::ctx(&mut scenario)
        );
        
        // Verify message count
        let room_id = object::id(&room);
        assert!(chat::get_room_message_count(&message_registry, room_id) == 1, 0);
        
        test_scenario::return_shared(profile_registry);
        test_scenario::return_shared(room_registry);
        test_scenario::return_shared(room);
        test_scenario::return_shared(message_registry);
        test_scenario::return_shared(member_registry);
    };
    
    // Verify message object trong transaction riêng
    test_scenario::next_tx(&mut scenario, USER1);
    {
        let message = test_scenario::take_from_sender<chat::Message>(&scenario);
        assert!(chat::get_message_content(&message) == string::utf8(b"Hello, world!"), 1);
        test_scenario::return_to_sender(&scenario, message);
    };
    
    clock::destroy_for_testing(clock);
    test_scenario::end(scenario);
}

#[test]
#[expected_failure(abort_code = chat::ENotInRoom)]
fun test_send_message_not_in_room_fails() {
    let mut scenario = setup_test();
    let clock = get_clock(&mut scenario);
    
    // Setup: User1 và User2 tạo profiles
    test_scenario::next_tx(&mut scenario, USER1);
    {
        let mut profile_registry = test_scenario::take_shared<chat::ProfileRegistry>(&scenario);
        chat::create_profile(&mut profile_registry, string::utf8(b"Alice"), &clock, test_scenario::ctx(&mut scenario));
        test_scenario::return_shared(profile_registry);
    };
    
    test_scenario::next_tx(&mut scenario, USER2);
    {
        let mut profile_registry = test_scenario::take_shared<chat::ProfileRegistry>(&scenario);
        chat::create_profile(&mut profile_registry, string::utf8(b"Bob"), &clock, test_scenario::ctx(&mut scenario));
        test_scenario::return_shared(profile_registry);
    };
    
    // User1 tạo room
    test_scenario::next_tx(&mut scenario, USER1);
    {
        let profile_registry = test_scenario::take_shared<chat::ProfileRegistry>(&scenario);
        let mut room_registry = test_scenario::take_shared<chat::RoomRegistry>(&scenario);
        let mut member_registry = test_scenario::take_shared<chat::RoomMemberRegistry>(&scenario);
        
        chat::create_room(
            &profile_registry,
            &mut room_registry,
            &mut member_registry,
            string::utf8(b"General"),
            string::utf8(b"Description"),
            &clock,
            test_scenario::ctx(&mut scenario)
        );
        
        test_scenario::return_shared(profile_registry);
        test_scenario::return_shared(room_registry);
        test_scenario::return_shared(member_registry);
    };
    
    // User2 (chưa join) cố gửi message - should fail
    test_scenario::next_tx(&mut scenario, USER2);
    {
        let profile_registry = test_scenario::take_shared<chat::ProfileRegistry>(&scenario);
        let room_registry = test_scenario::take_shared<chat::RoomRegistry>(&scenario);
        let room = test_scenario::take_shared<chat::Room>(&scenario);
        let mut message_registry = test_scenario::take_shared<chat::MessageRegistry>(&scenario);
        let member_registry = test_scenario::take_shared<chat::RoomMemberRegistry>(&scenario);
        
        chat::send_message(
            &profile_registry,
            &room_registry,
            &room,
            &mut message_registry,
            &member_registry,
            string::utf8(b"Hello"),
            &clock,
            test_scenario::ctx(&mut scenario)
        );
        
        test_scenario::return_shared(profile_registry);
        test_scenario::return_shared(room_registry);
        test_scenario::return_shared(room);
        test_scenario::return_shared(message_registry);
        test_scenario::return_shared(member_registry);
    };
    
    clock::destroy_for_testing(clock);
    test_scenario::end(scenario);
}

// === Test Leave Room ===
#[test]
fun test_leave_room_success() {
    let mut scenario = setup_test();
    let clock = get_clock(&mut scenario);
    
    // Setup: User1 tạo profile và room
    test_scenario::next_tx(&mut scenario, USER1);
    {
        let mut profile_registry = test_scenario::take_shared<chat::ProfileRegistry>(&scenario);
        chat::create_profile(&mut profile_registry, string::utf8(b"Alice"), &clock, test_scenario::ctx(&mut scenario));
        test_scenario::return_shared(profile_registry);
    };
    
    test_scenario::next_tx(&mut scenario, USER1);
    {
        let profile_registry = test_scenario::take_shared<chat::ProfileRegistry>(&scenario);
        let mut room_registry = test_scenario::take_shared<chat::RoomRegistry>(&scenario);
        let mut member_registry = test_scenario::take_shared<chat::RoomMemberRegistry>(&scenario);
        
        chat::create_room(
            &profile_registry,
            &mut room_registry,
            &mut member_registry,
            string::utf8(b"General"),
            string::utf8(b"Description"),
            &clock,
            test_scenario::ctx(&mut scenario)
        );
        
        test_scenario::return_shared(profile_registry);
        test_scenario::return_shared(room_registry);
        test_scenario::return_shared(member_registry);
    };
    
    // User1 leave room
    test_scenario::next_tx(&mut scenario, USER1);
    {
        let mut room = test_scenario::take_shared<chat::Room>(&scenario);
        let mut member_registry = test_scenario::take_shared<chat::RoomMemberRegistry>(&scenario);
        
        assert!(chat::get_room_member_count(&room) == 1, 0);
        chat::leave_room(&mut room, &mut member_registry, test_scenario::ctx(&mut scenario));
        assert!(chat::get_room_member_count(&room) == 0, 1);
        
        test_scenario::return_shared(room);
        test_scenario::return_shared(member_registry);
    };
    
    clock::destroy_for_testing(clock);
    test_scenario::end(scenario);
}

// === Test Update Username ===
#[test]
fun test_update_username_success() {
    let mut scenario = setup_test();
    let clock = get_clock(&mut scenario);
    
    // User1 tạo profile
    test_scenario::next_tx(&mut scenario, USER1);
    {
        let mut profile_registry = test_scenario::take_shared<chat::ProfileRegistry>(&scenario);
        chat::create_profile(&mut profile_registry, string::utf8(b"Alice"), &clock, test_scenario::ctx(&mut scenario));
        test_scenario::return_shared(profile_registry);
    };
    
    // User1 update username
    test_scenario::next_tx(&mut scenario, USER1);
    {
        let mut profile_registry = test_scenario::take_shared<chat::ProfileRegistry>(&scenario);
        let mut profile = test_scenario::take_from_sender<chat::UserProfile>(&scenario);
        
        assert!(chat::get_username(&profile) == string::utf8(b"Alice"), 0);
        chat::update_username(&mut profile_registry, &mut profile, string::utf8(b"Alicia"), &clock, test_scenario::ctx(&mut scenario));
        assert!(chat::get_username(&profile) == string::utf8(b"Alicia"), 1);
        
        test_scenario::return_shared(profile_registry);
        test_scenario::return_to_sender(&scenario, profile);
    };
    
    clock::destroy_for_testing(clock);
    test_scenario::end(scenario);
}

// Note: test_update_username_unauthorized không thể test được trực tiếp
// vì UserProfile là owned object, User2 không thể lấy được profile của User1.
// Logic authorization đã được đảm bảo trong update_username function
// với check: assert!(profile.owner == ctx.sender(), EUnauthorized)

// === Test View Functions ===
#[test]
fun test_view_functions() {
    let mut scenario = setup_test();
    let clock = get_clock(&mut scenario);
    
    // User1 tạo profile
    test_scenario::next_tx(&mut scenario, USER1);
    {
        let mut profile_registry = test_scenario::take_shared<chat::ProfileRegistry>(&scenario);
        chat::create_profile(&mut profile_registry, string::utf8(b"Alice"), &clock, test_scenario::ctx(&mut scenario));
        test_scenario::return_shared(profile_registry);
    };
    
    // Test view functions
    test_scenario::next_tx(&mut scenario, USER1);
    {
        let profile_registry = test_scenario::take_shared<chat::ProfileRegistry>(&scenario);
        let profile = test_scenario::take_from_sender<chat::UserProfile>(&scenario);
        
        // Test has_profile
        assert!(chat::has_profile(&profile_registry, USER1), 0);
        assert!(!chat::has_profile(&profile_registry, USER2), 1);
        
        // Test get_profile_id_by_address
        let profile_id = chat::get_profile_id_by_address(&profile_registry, USER1);
        assert!(profile_id == object::id(&profile), 2);
        
        // Test get_profile_summary - fields are private, skip direct field access
        // Summary can be used in view functions but fields are module-private
        
        // Test is_username_taken
        assert!(chat::is_username_taken(&profile_registry, string::utf8(b"Alice")), 5);
        assert!(chat::is_username_taken(&profile_registry, string::utf8(b"alice")), 6); // case-insensitive
        assert!(!chat::is_username_taken(&profile_registry, string::utf8(b"Bob")), 7);
        
        // Test get_address_by_username
        let addr_opt = chat::get_address_by_username(&profile_registry, string::utf8(b"Alice"));
        let user1_addr = USER1;
        assert!(option::contains(&addr_opt, &user1_addr), 8);
        
        test_scenario::return_shared(profile_registry);
        test_scenario::return_to_sender(&scenario, profile);
    };
    
    clock::destroy_for_testing(clock);
    test_scenario::end(scenario);
}

// === Test Full Flow ===
#[test]
fun test_full_chat_flow() {
    let mut scenario = setup_test();
    let clock = get_clock(&mut scenario);
    
    // Step 1: User1 và User2 tạo profiles
    test_scenario::next_tx(&mut scenario, USER1);
    {
        let mut profile_registry = test_scenario::take_shared<chat::ProfileRegistry>(&scenario);
        chat::create_profile(&mut profile_registry, string::utf8(b"Alice"), &clock, test_scenario::ctx(&mut scenario));
        test_scenario::return_shared(profile_registry);
    };
    
    test_scenario::next_tx(&mut scenario, USER2);
    {
        let mut profile_registry = test_scenario::take_shared<chat::ProfileRegistry>(&scenario);
        chat::create_profile(&mut profile_registry, string::utf8(b"Bob"), &clock, test_scenario::ctx(&mut scenario));
        test_scenario::return_shared(profile_registry);
    };
    
    // Step 2: User1 tạo room
    test_scenario::next_tx(&mut scenario, USER1);
    {
        let profile_registry = test_scenario::take_shared<chat::ProfileRegistry>(&scenario);
        let mut room_registry = test_scenario::take_shared<chat::RoomRegistry>(&scenario);
        let mut member_registry = test_scenario::take_shared<chat::RoomMemberRegistry>(&scenario);
        
        chat::create_room(
            &profile_registry,
            &mut room_registry,
            &mut member_registry,
            string::utf8(b"General"),
            string::utf8(b"General discussion"),
            &clock,
            test_scenario::ctx(&mut scenario)
        );
        
        test_scenario::return_shared(profile_registry);
        test_scenario::return_shared(room_registry);
        test_scenario::return_shared(member_registry);
    };
    
    // Step 3: User2 join room
    test_scenario::next_tx(&mut scenario, USER2);
    {
        let profile_registry = test_scenario::take_shared<chat::ProfileRegistry>(&scenario);
        let mut member_registry = test_scenario::take_shared<chat::RoomMemberRegistry>(&scenario);
        let mut room = test_scenario::take_shared<chat::Room>(&scenario);
        
        chat::join_room(&profile_registry, &mut room, &mut member_registry, test_scenario::ctx(&mut scenario));
        assert!(chat::get_room_member_count(&room) == 2, 0);
        
        test_scenario::return_shared(profile_registry);
        test_scenario::return_shared(member_registry);
        test_scenario::return_shared(room);
    };
    
    // Step 4: User1 và User2 gửi messages
    test_scenario::next_tx(&mut scenario, USER1);
    {
        let profile_registry = test_scenario::take_shared<chat::ProfileRegistry>(&scenario);
        let room_registry = test_scenario::take_shared<chat::RoomRegistry>(&scenario);
        let room = test_scenario::take_shared<chat::Room>(&scenario);
        let mut message_registry = test_scenario::take_shared<chat::MessageRegistry>(&scenario);
        let member_registry = test_scenario::take_shared<chat::RoomMemberRegistry>(&scenario);
        
        chat::send_message(
            &profile_registry,
            &room_registry,
            &room,
            &mut message_registry,
            &member_registry,
            string::utf8(b"Hello Bob!"),
            &clock,
            test_scenario::ctx(&mut scenario)
        );
        
        let room_id = object::id(&room);
        assert!(chat::get_room_message_count(&message_registry, room_id) == 1, 1);
        
        test_scenario::return_shared(profile_registry);
        test_scenario::return_shared(room_registry);
        test_scenario::return_shared(room);
        test_scenario::return_shared(message_registry);
        test_scenario::return_shared(member_registry);
    };
    
    test_scenario::next_tx(&mut scenario, USER2);
    {
        let profile_registry = test_scenario::take_shared<chat::ProfileRegistry>(&scenario);
        let room_registry = test_scenario::take_shared<chat::RoomRegistry>(&scenario);
        let room = test_scenario::take_shared<chat::Room>(&scenario);
        let mut message_registry = test_scenario::take_shared<chat::MessageRegistry>(&scenario);
        let member_registry = test_scenario::take_shared<chat::RoomMemberRegistry>(&scenario);
        
        chat::send_message(
            &profile_registry,
            &room_registry,
            &room,
            &mut message_registry,
            &member_registry,
            string::utf8(b"Hi Alice!"),
            &clock,
            test_scenario::ctx(&mut scenario)
        );
        
        let room_id = object::id(&room);
        assert!(chat::get_room_message_count(&message_registry, room_id) == 2, 2);
        
        test_scenario::return_shared(profile_registry);
        test_scenario::return_shared(room_registry);
        test_scenario::return_shared(room);
        test_scenario::return_shared(message_registry);
        test_scenario::return_shared(member_registry);
    };
    
    // Step 5: User2 leave room
    test_scenario::next_tx(&mut scenario, USER2);
    {
        let mut room = test_scenario::take_shared<chat::Room>(&scenario);
        let mut member_registry = test_scenario::take_shared<chat::RoomMemberRegistry>(&scenario);
        
        chat::leave_room(&mut room, &mut member_registry, test_scenario::ctx(&mut scenario));
        assert!(chat::get_room_member_count(&room) == 1, 3);
        
        test_scenario::return_shared(room);
        test_scenario::return_shared(member_registry);
    };
    
    clock::destroy_for_testing(clock);
    test_scenario::end(scenario);
}
