<script>
  import phx from "phoenix";
  import { onMount } from "svelte";
  export let name;
  const { Socket } = phx;

  let socket = new Socket("/socket", { params: { userToken: "123" } });
  socket.connect()
  let channel = socket.channel("room:lobby", {});

  onMount(async () => {
	  console.log(channel)
    channel
      .join()
      .receive("ok", resp => {
        console.log("Joined successfully", resp);
      })
      .receive("error", resp => {
        console.log("Unable to join", resp);
      });
  });
</script>

<style>
  h1 {
    color: purple;
  }
</style>

<h1>hmma {name}!</h1>
