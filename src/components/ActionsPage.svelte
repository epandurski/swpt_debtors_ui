<script lang="ts">
  import { DOWNLOADED_QR_COIN_KEY, IS_A_NEWBIE_KEY, HAS_LOADED_PAYMENT_REQUEST_KEY } from '../app-state'
  import type { AppState, ActionsModel } from '../app-state'
  import type { ActionRecordWithId } from '../operations'
  import Fab, { Icon } from '@smui/fab';
  import LayoutGrid, { Cell } from '@smui/layout-grid'
  import ActionCard from './ActionCard.svelte'
  import Checkbox from '@smui/checkbox'
  import FormField from '@smui/form-field'
  import Paper, { Title, Content } from '@smui/paper'
  import Page from './Page.svelte'
  import Card, { Actions, Content as CardContent } from '@smui/card'
  import Button, { Label } from '@smui/button'
  import MakePaymentDialog from './MakePaymentDialog.svelte'

  export let app: AppState
  export let model: ActionsModel
  export const snackbarBottom: string = '84px'

  const SHOW_FOREIGN_ACTIONS_KEY = 'debtors.showForeignActions'
  const debtorConfigData = app.getDebtorConfigData()
  const scrollElement = document.documentElement
  const downloadedQrCoin = localStorage.getItem(DOWNLOADED_QR_COIN_KEY) === 'true'
  let isANewbie = localStorage.getItem(IS_A_NEWBIE_KEY) === 'true'
  let showForeignActions = localStorage.getItem(SHOW_FOREIGN_ACTIONS_KEY) === 'true'
  let hasLoadedPaymentRequest = localStorage.getItem(HAS_LOADED_PAYMENT_REQUEST_KEY) === 'true'
  let showMakePaymentDialog = false

  function separateForeignActions(allActions: ActionRecordWithId[]): [ActionRecordWithId[], ActionRecordWithId[]] {
    let regularActions = []
    let foreignActions = []
    for (const action of allActions) {
      if (action.actionType === 'AbortTransfer' && !action.transfer.originatesHere) {
        foreignActions.push(action)
      } else {
        regularActions.push(action)
      }
    }
    return [regularActions, foreignActions]
  }

  function showAction(actionId: number): void {
    const scrollTop = scrollElement.scrollTop
    const scrollLeft = scrollElement.scrollLeft
    app.showAction(actionId, () => {
      app.pageModel.set({ ...model, scrollTop, scrollLeft })
    })
  }

  function showTransfers(): void {
    app.startInteraction()
    app.showTransfers()
  }

  function showConfig(): void {
    app.startInteraction()
    app.showConfig()
  }

  function editConfig(): void {
    app.startInteraction()
    app.editConfig(debtorConfigData)
  }

  function scanPaymentRequest(): void {
    app.startInteraction()
    showMakePaymentDialog = true
  }

  $: actions = model.actions
  $: [regularActions, foreignActions] = separateForeignActions($actions)
  $: hasRegularActions = regularActions.length > 0
  $: hasForeignActions = foreignActions.length > 0
  $: hasConfiguredCurrency = debtorConfigData.debtorInfo !== undefined
  $: localStorage.setItem(SHOW_FOREIGN_ACTIONS_KEY, String(showForeignActions))
  $: suggestQrCoinDownload = isANewbie && hasConfiguredCurrency && !hasRegularActions && !downloadedQrCoin
  $: if (!hasConfiguredCurrency) {
    localStorage.setItem(IS_A_NEWBIE_KEY, 'true')
    isANewbie = true
  }
</script>

<style>
  .fab-container {
    margin: 16px 16px;
  }
  .no-actions {
    --no-actions-color: #888;
    font-size: 1.25em;
    margin: 36px 18px 26px 18px;
    text-align: center;
    color: var(--no-actions-color);
  }
</style>

<Page title="Actions" scrollTop={model.scrollTop} scrollLeft={model.scrollLeft}>
  <svelte:fragment slot="content">
    {#if hasRegularActions }
      <LayoutGrid>
        {#each regularActions as action (action.actionId)}
          <Cell>
            <ActionCard {action} show={() => showAction(action.actionId)} />
          </Cell>
        {/each}
      </LayoutGrid>
    {:else}
      {#if hasConfiguredCurrency}
        {#if suggestQrCoinDownload}
          <LayoutGrid>
            <Cell>
              <Paper elevation={8} style="margin-bottom: 16px">
                <Title>Congratulations!</Title>
                <Content>
                  You have successfully configured your digital currency. Press the
                  <Icon style="vertical-align: middle" class="material-icons">qr_code_2</Icon>
                  button below, to download your digital coin.
                </Content>
              </Paper>
            </Cell>
          </LayoutGrid>
        {:else}
          {#if !isANewbie || hasLoadedPaymentRequest}
            <p class="no-actions">
              Press the
              <Icon class="material-icons" style="vertical-align: middle">local_atm</Icon>
              button below, to issue money in circulation.
            </p>
          {:else}
            <LayoutGrid>
              <Cell>
                <Paper elevation={8} style="margin-bottom: 16px">
                  <Title>How to issue money in circulation?</Title>
                  <Content>
                    Each time someone accepts a payment in your
                    currency from you (the issuer of the currency),
                    new money gets created.
                    <br>
                    <br>
                    To make a payment to someone, a payment request
                    must be generated by the payee. Then, you should
                    scan the QR code of the payment request, or load
                    it from file.
                    <br>
                    <br>
                    Press the
                    <Icon class="material-icons" style="margin: 0 0.15em; vertical-align: middle">local_atm</Icon>
                    button below, to load a payment request.
                  </Content>
                </Paper>
              </Cell>
            </LayoutGrid>
          {/if}
        {/if}
      {:else}
        <LayoutGrid>
          <Cell>
            <Paper elevation={8} style="margin-bottom: 16px">
              <Title>Are you new to Swaptacular?</Title>
              <Content>
                Every time this app starts, you will see the "Actions"
                screen first. It shows things that require your
                attention &ndash; like actions that have been started,
                but have not been finalized.
              </Content>
            </Paper>
          </Cell>
          <Cell>
            <Card>
              <CardContent>
                A new digital currency have been created for
                you. Before everybody can use it, you need to specify
                some basic information about your currency &ndash; the
                currency name, the interest rate, and few other
                things.
              </CardContent>
              <Actions fullBleed>
                <Button on:click={editConfig}>
                  <Label>Configure currency</Label>
                  <i class="material-icons" aria-hidden="true">arrow_forward</i>
                </Button>
              </Actions>
            </Card>
          </Cell>
        </LayoutGrid>
      {/if}
    {/if}
    {#if hasForeignActions}
      <LayoutGrid>
        <Cell span={12}>
          <FormField>
            <Checkbox bind:checked={showForeignActions} />
            <span slot="label">Show troubled payments initiated from other devices.</span>
          </FormField>
        </Cell>
        {#if showForeignActions }
          {#each foreignActions as action (action.actionId)}
            <Cell>
              <ActionCard color="secondary" {action} show={() => showAction(action.actionId)} />
            </Cell>
          {/each}
        {/if}
      </LayoutGrid>
    {/if}

    <MakePaymentDialog bind:open={showMakePaymentDialog}/>
  </svelte:fragment>

  <svelte:fragment slot="floating">
    <div class="fab-container">
      <Fab on:click={showTransfers}>
        <Icon class="material-icons">history</Icon>
      </Fab>
    </div>
    <div class="fab-container">
      <Fab
        color={!suggestQrCoinDownload && hasConfiguredCurrency ? "primary" : "secondary"}
        on:click={scanPaymentRequest}
        >
        <Icon class="material-icons">local_atm</Icon>
      </Fab>
    </div>
    <div class="fab-container">
      <Fab color="primary" on:click={showConfig}>
        <Icon class="material-icons">qr_code_2</Icon>
      </Fab>
    </div>
  </svelte:fragment>
</Page>
