<script lang="ts">
  async function login() {
    await fetch('http://localhost:3000/login');
  }
</script>

<main class="grid place-items-center min-h-screen">
  <button onclick={login} aria-label="login">Login</button>
</main>
