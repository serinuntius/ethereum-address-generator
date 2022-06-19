import { invoke } from '@tauri-apps/api'
import { ethers } from 'ethers';
import { createSignal, For } from 'solid-js';



export const TodoList = () => {
  let input!: HTMLInputElement;

  const [address, setAddress] = createSignal<string>('');
  const [secretKey, setSecretKey] = createSignal<string>('');
  const [disableButton, setDisableButton] = createSignal<boolean>(false);
  const [avgTime, setAvgTime] = createSignal<string>('0');
  const [time, setTime] = createSignal<string>('0');
  const [times, setTimes] = createSignal<number[]>([]);


  const calcByRust = async  (target: string): Promise<string[]> =>  {
    const result = await invoke('generate_address', {startWith: target}) as string[];
    return [result[0],`0x${result[1]}`];
  }

  const calcByJs = (target: string): string[] => {
    while (true) {
      const wallet = ethers.Wallet.createRandom();
      if (wallet.address.indexOf(input.value) >= 0) {
        return [wallet.address, wallet._signingKey().privateKey];
      }
    }
  }

  const invokeGenerateAddress = async (type: 'rust' | 'js') => {
    setDisableButton(true);
    if (!input.value.trim()) return;
    const startTime = performance.now(); // 開始時間

    const [_address, _key] = type === 'rust' ? await calcByRust(input.value) : calcByJs(input.value);
    setAddress(_address);
    setSecretKey(_key);
    setDisableButton(false);

    const endTime = performance.now(); // 終了時間

    const diff = Math.round(endTime - startTime).toString();

    setTime(diff);
    setTimes((prev) => [...prev, parseInt(diff)]);
    const avg = times().reduce((sum,elem) => sum + elem) / times().length;
    setAvgTime(Math.round(avg).toString());
  }

  return (
    <>
      <div>
        <input placeholder="generate ethereum address start with" ref={input} />
        <button onClick={() => invokeGenerateAddress('rust')} disabled={disableButton()}>
          Generate Address by Rust
        </button>
        <button onClick={() => invokeGenerateAddress('js')} disabled={disableButton()}>
          Generate Address by ethers.js
        </button>
        <br/>
        <br/>
        <div>
          secretKey: {secretKey}<br/>
          address: {address}<br/>
          time: {time} msec <br/>
          average time: {avgTime} msec
        </div>
      </div>
    </>
  );
}