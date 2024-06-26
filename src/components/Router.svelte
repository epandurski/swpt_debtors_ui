<script lang="ts">
  import { setContext, onMount } from 'svelte'
  import { fade } from 'svelte/transition'
  import type { AppState } from '../app-state'
  import { LOCALSTORAGE_STATE } from '../web-api'
  import ActionPage from './ActionPage.svelte'
  import ActionsPage from './ActionsPage.svelte'
  import TransferPage from './TransferPage.svelte'
  import TransfersPage from './TransfersPage.svelte'
  import ConfigDataPage from './ConfigDataPage.svelte'

  export let app: AppState
  export let snackbarBottom: string

  const { pageModel } = app
  const originalAppState = app
  let exiting = false

  function enusreOriginalAppState(appState: AppState): void {
    if (appState !== originalAppState) throw new Error('unoriginal app state')
  }

  function getPageComponent(pageModelType: string) {
    switch (pageModelType) {
    case 'ActionModel':
      return ActionPage
    case 'ActionsModel':
      return ActionsPage
    case 'TransferModel':
      return TransferPage
    case 'TransfersModel':
      return TransfersPage
    case 'ConfigDataModel':
      return ConfigDataPage
    default:
      throw new Error('unknown page model type')
    }
  }

  function getUniquePageComponent(pageModelType: string) {
    const PageComponent = getPageComponent(pageModelType)

    // Here we create a unique copy of the component,
    // because <svelte:component> will destroy the old component and
    // create a new one only when a different component has been
    // passed (to the `this` property).
    return class extends PageComponent {}
  }

  function onPopstate() {
    if (app.goBack) {
      app.goBack()
    } else if ($pageModel.goBack) {
      $pageModel.goBack()
    } else {
      exiting = true  // Shows the "Tap again to exit" overlay.
      sessionStorage.removeItem(LOCALSTORAGE_STATE)
      history.back()
    }
  }

  setContext('app', app)

  onMount(() => {
    history.scrollRestoration = 'manual'
    addEventListener('popstate', onPopstate)
    return () => {
      removeEventListener("popstate", onPopstate)
    }
  })

  $: enusreOriginalAppState(app)
  $: pageComponent = getUniquePageComponent($pageModel.type)
</script>

<style>
  #overlay {
    position: fixed;
    width: 100%;
    height: 100%;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0,0,0,0.1);
    cursor: not-allowed;
    z-index: 100;
    display: flex;
    justify-content: center;
    align-items: center;
  }
  #text {
    font-size: 24px;
    padding: 8px;
    background-color: rgb(229,229,229);
    color: black;
    user-select: none;
  }
</style>

{#if exiting}
  <div id="overlay">
    <div id="text" in:fade="{{ duration: 300, delay: 200 }}">Tap again to exit</div>
  </div>
{/if}

<svelte:component this={pageComponent} model={$pageModel} {app} bind:snackbarBottom />
