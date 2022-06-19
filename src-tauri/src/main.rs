#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use std::sync::mpsc;

use anyhow::Result;
use ethers::{
    prelude::{k256::ecdsa::SigningKey, rand, Signer, Wallet},
    utils::hex::ToHex,
};
use tokio::sync::watch;

#[tauri::command(async)]
async fn generate_address(start_with: String) -> Result<(String, String), ()> {
    let cpus = num_cpus::get() - 1;
    println!("cpus: {}", cpus);
    let (tx, rx) = mpsc::channel();
    let (stop_tx, stop_rx) = watch::channel(false);

    let mut handles = vec![];

    for _ in 0..cpus {
        let tx = tx.clone();
        let stop_rx = stop_rx.clone();
        let start_with = start_with.clone();

        handles.push(tokio::spawn(async move {
            loop {
                if stop_rx.has_changed().unwrap_or(true) {
                    break;
                }

                let key = Wallet::<SigningKey>::new(&mut rand::thread_rng());
                let address = key.address().to_string();

                if address.starts_with(start_with.as_str()) {
                    let hex_key = key.signer().to_bytes().encode_hex();
                    println!("hex_key: {}", hex_key);
                    if let Some(err) = tx.send((format!("{:?}", key.address()), hex_key)).err() {
                        println!("err: {}", err);
                    }
                    break;
                }
            }
        }))
    }

    let answer = rx.recv().expect("failed to recvs");
    stop_tx.send(true).expect("failed to send stop");

    Ok(answer)
}

fn main() {
    let context = tauri::generate_context!();
    println!("ok");
    tauri::Builder::default()
        .menu(tauri::Menu::os_default(&context.package_info().name))
        .invoke_handler(tauri::generate_handler![generate_address])
        .run(context)
        .expect("error while running tauri application");
}
