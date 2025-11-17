<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let value = 3;
  export let color = 'var(--weight-3)';
  export let compact = false;
  export let ariaLabel = 'Adjust weight';
  export let title = '';
  export let enableWheel = true;
  export let stopPointerEvents = true;
  export let minusLabel = 'See less often';
  export let plusLabel = 'See more often';

  const dispatch = createEventDispatcher<{ change: { delta: number; source: 'button' | 'wheel' } }>();
  const SPARK_PATH =
    'M9 4.5c.335 0 .629.222.721.544l.813 2.846c.356 1.246 1.33 2.219 2.576 2.575l2.846.814c.322.092.544.386.544.721s-.222.629-.544.721l-2.846.813c-1.246.356-2.22 1.33-2.576 2.576l-.813 2.846c-.092.322-.386.544-.721.544s-.629-.222-.721-.544l-.813-2.846c-.356-1.246-1.33-2.22-2.576-2.576l-2.846-.813C2.222 12.629 2 12.335 2 12s.222-.629.544-.721l2.846-.814c1.246-.356 2.22-1.33 2.576-2.575l.813-2.846C8.371 4.722 8.665 4.5 9 4.5Zm9-3c.344 0 .644.234.728.568l.259 1.035c.235.94.97 1.675 1.91 1.91l1.035.259c.334.083.568.383.568.728s-.234.644-.568.727l-1.035.259c-.94.235-1.675.97-1.91 1.91l-.259 1.035A.75.75 0 0 1 18 10.5a.75.75 0 0 1-.728-.568l-.259-1.035c-.235-.94-.97-1.675-1.91-1.91l-1.035-.259A.75.75 0 0 1 13.5 6c0-.345.234-.645.568-.728l1.035-.259c.94-.235 1.675-.97 1.91-1.91l.259-1.035A.75.75 0 0 1 18 1.5Zm-1.5 13.5c.323 0 .61.206.712.513l.394 1.183c.149.448.501.8.949.949l1.183.394c.306.102.512.389.512.712s-.206.61-.512.712l-1.183.394a1.5 1.5 0 0 0-.949.949l-.394 1.183a.75.75 0 0 1-1.424 0l-.394-1.183a1.5 1.5 0 0 0-.949-.949l-1.183-.394A.75.75 0 0 1 12.75 18c0-.323.206-.61.512-.712l1.183-.394a1.5 1.5 0 0 0 .949-.949l.394-1.183a.75.75 0 0 1 .712-.513Z';

  function emit(delta: number, source: 'button' | 'wheel') {
    dispatch('change', { delta, source });
  }

  function handleWheel(event: WheelEvent) {
    if (!enableWheel) return;
    event.preventDefault();
    event.stopPropagation();
    emit(event.deltaY > 0 ? 1 : -1, 'wheel');
  }

  function handlePointerDown(event: PointerEvent) {
    if (stopPointerEvents) {
      event.stopPropagation();
    }
  }

  function handleButtonClick(event: MouseEvent, delta: number) {
    event.preventDefault();
    event.stopPropagation();
    emit(delta, 'button');
  }
</script>

<div
  class={`weight-spark${compact ? ' weight-spark--compact' : ''}`}
  role="group"
  aria-label={ariaLabel}
  style={`--weight-spark-color: ${color};`}
  data-value={value}
  on:wheel={handleWheel}
  on:pointerdown={handlePointerDown}
>
  <button
    type="button"
    class="weight-spark__btn"
    aria-label={minusLabel}
    on:click={(event) => handleButtonClick(event, -1)}
  >
    −
  </button>
  <div class="weight-spark__core" title={title}>
    <svg class="weight-spark__icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d={SPARK_PATH} fill="currentColor" fill-rule="evenodd" clip-rule="evenodd" />
    </svg>
  </div>
  <button
    type="button"
    class="weight-spark__btn"
    aria-label={plusLabel}
    on:click={(event) => handleButtonClick(event, 1)}
  >
    +
  </button>
</div>

<style>
  .weight-spark {
    --weight-spark-color: var(--weight-3);
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }

  .weight-spark__btn {
    width: 24px;
    height: 24px;
    border-radius: 8px;
    border: 1px solid #3e4564;
    background: rgba(255, 255, 255, 0.03);
    color: var(--fg);
    font-size: 15px;
    line-height: 1;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: border-color 0.2s ease, color 0.2s ease;
    padding: 0;
  }

  .weight-spark__btn:hover {
    border-color: var(--weight-spark-color);
    color: var(--weight-spark-color);
  }

  .weight-spark__core {
    width: 24px;
    height: 24px;
    border-radius: 10px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    background: rgba(255, 255, 255, 0.04);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.45);
    padding: 1px;
  }

  .weight-spark__icon {
    width: 18px;
    height: 18px;
    color: var(--weight-spark-color);
    filter: drop-shadow(0 0 6px var(--weight-spark-color));
  }

  .weight-spark--compact {
    gap: 2px;
  }

  .weight-spark--compact .weight-spark__btn {
    width: 22px;
    height: 22px;
    font-size: 14px;
  }

  .weight-spark--compact .weight-spark__core {
    width: 22px;
    height: 22px;
  }

  .weight-spark--compact .weight-spark__icon {
    width: 16px;
    height: 16px;
  }
</style>
