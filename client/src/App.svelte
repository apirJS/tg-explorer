<script lang="ts">
  async function login() {
    try {
      const request = await fetch('http://localhost:3000/login');
      if (!request.ok) {
        alert(505)
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : "Unknown error.")
    }
  }
</script>

<main class="grid place-items-center min-h-screen">
  <button onclick={login} aria-label="login">Login</button>
</main>
