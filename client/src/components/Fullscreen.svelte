<script>
  // https://github.com/andrelmlins/svelte-fullscreen
  // Svelte FullScreen is open source software licensed as MIT.
  import { onMount, onDestroy, createEventDispatcher } from "svelte";
  import screenfull from "../lib/screenfull";
  let component;
  const dispatch = createEventDispatcher();
  onMount(() => {
    screenfull.on("change", (e) => {
		dispatch("change", { current : screenfull.isFullscreen });
	});
    screenfull.on("error", () => { dispatch("error"); });
  });
  const onToggle = () => {
    screenfull.toggle(component.nextElementSibling);
  };
  const onRequest = () => {
    screenfull.request(component.nextElementSibling);
  };
  const onExit = () => {
    screenfull.exit(component.nextElementSibling);
  };
  onDestroy(() => {
    screenfull.off("change", null);
    screenfull.off("error", null);
  });
</script>
<div style="width:0; height:0" bind:this={component} />
<slot {onToggle} {onRequest} {onExit} />
