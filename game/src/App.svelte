<script>
  import phx from "phoenix";
  import { onMount } from "svelte";
  import { storeObj, changeNestedMutation, mutateSurreptitiously, update } from "./store.js"
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
hm b is {$storeObj.b.b.b}

<button on:click={changeNestedMutation}> change is good </button>
<button on:click={mutateSurreptitiously}> but not too much </button>
<button on:click={update}> update with some obj</button>