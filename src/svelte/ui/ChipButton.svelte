<script lang="ts">
  export let pressed: boolean | null = null;
  export let icon = false;
  export let variant: 'default' | 'danger' = 'default';
  export let type: 'button' | 'submit' | 'reset' = 'button';
  export let disabled = false;
  export let title: string | undefined = undefined;
  export let el: HTMLButtonElement | null = null;
  let extraClass = '';
  let restProps: Record<string, unknown> = {};

  $: ({ class: extraClass = '', ...restProps } = $$restProps);
  $: chipClass = [
    'chip',
    icon ? 'chip--icon' : '',
    variant === 'danger' ? 'chip--danger' : '',
    extraClass
  ]
    .filter(Boolean)
    .join(' ');
</script>

<button
  {...restProps}
  type={type}
  class={chipClass}
  aria-pressed={pressed === null ? undefined : pressed}
  {title}
  disabled={disabled}
  bind:this={el}
  on:click
>
  <slot />
</button>

<style>
  .chip {
    appearance: none;
    border: 1px solid #56608a;
    background: #242a46;
    color: var(--fg);
    padding: 6px 12px;
    border-radius: 18px;
    font: 600 13px system-ui;
    cursor: pointer;
    transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease, transform 0.02s;
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  .chip--icon {
    padding: 6px;
    min-width: 34px;
    min-height: 34px;
    border-radius: 12px;
    font-size: 18px;
    justify-content: center;
    gap: 0;
  }

  .chip--danger {
    background: #6b192c;
    border-color: #ff4d7d;
    color: #fff;
  }

  .chip:disabled {
    opacity: 0.45;
    cursor: default;
    border-color: #3b4260;
    color: var(--fg-dim);
  }

  .chip:hover:not(:disabled) {
    border-color: #6b76a8;
  }

  .chip[aria-pressed='true'] {
    background: var(--accent);
    color: #0b1025;
    border-color: var(--accent);
  }

  .chip:active:not(:disabled) {
    transform: translateY(1px);
  }
</style>
