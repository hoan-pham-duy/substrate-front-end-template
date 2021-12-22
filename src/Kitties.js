import React, { useEffect, useState } from 'react';
import { Form, Grid } from 'semantic-ui-react';

import { useSubstrate } from './substrate-lib';
import { TxButton } from './substrate-lib/components';

import KittyCards from './KittyCards';

import {decode as atob, encode as btoa} from 'base-64'

const convertToKittyHash = entry =>
  `0x${entry[0].toJSON().slice(-64)}`;

const constructKitty = (hash, { dna, price, gender, owner }) => ({
  id: hash,
  dna: atob(Buffer.from(dna, 'binary').toString('base64')),
  price: price.toJSON(),
  gender: gender.toJSON(),
  owner: owner.toJSON()
});

export default function Kitties (props) {
  const { api, keyring } = useSubstrate();
  const { accountPair } = props;

  const [kittyHashes, setKittyHashes] = useState([]);
  const [kitties, setKitties] = useState([]);
  const [nftObjectBase64Str, setNftObjectBase64Str] = useState([]);
  const [status, setStatus] = useState('');

  const subscribeKittyCnt = () => {
    let unsub = null;

    const asyncFetch = async () => {
      unsub = await api.query.substrateKitties.kittyCnt(async cnt => {
        // Fetch all kitty keys
        const entries = await api.query.substrateKitties.kitties.entries();
        const hashes = entries.map(convertToKittyHash);
        setKittyHashes(hashes);
      });
    };

    asyncFetch();

    return () => {
      unsub && unsub();
    };
  };

  const subscribeKitties = () => {
    let unsub = null;

    const asyncFetch = async () => {
      unsub = await api.query.substrateKitties.kitties.multi(kittyHashes, kitties => {
        const kittyArr = kitties
          .map((kitty, ind) => constructKitty(kittyHashes[ind], kitty.value));
        setKitties(kittyArr);
      });
    };

    asyncFetch();

    // return the unsubscription cleanup function
    return () => {
      unsub && unsub();
    };
  };
  const convertFileToBase64 = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = () => resolve({
        fileName: file.title,
        base64: reader.result
    });
    reader.onerror = reject;
});

const fileToDataUri = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = (event) => {
    resolve(event.target.result)
  };
  reader.readAsDataURL(file);
});

  const onChangeNftObject = async (e) => {
    console.log('onChangeNftObject');
    console.log('e inside onChangeNftObject', e);
    if (e !== undefined) {
      // let nftObjectBase64StrTmp = btoa(e.target.files[0])
      let nftObjectBase64StrTmp = await convertFileToBase64(e.target.files[0])
      .then(res => res.base64)
      .catch(err => {
        console.log(err)
      });
      // var reader = new FileReader()
      // reader.addEventListener('load', readFile)
      // reader.readAsText(e.target.files[0])
      setNftObjectBase64Str(nftObjectBase64StrTmp)
      console.log('nftObjectBase64StrTmp', nftObjectBase64StrTmp);
      setNftObjectBase64Str(nftObjectBase64StrTmp)
    }
    // setNftObjectFile(e.target.files[0]);
    return null;
  }

  useEffect(subscribeKitties, [api, kittyHashes]);
  useEffect(subscribeKittyCnt, [api, keyring]);

  return <Grid.Column width={16}>
  <h1>Kitties</h1>
  <KittyCards kitties={kitties} accountPair={accountPair} setStatus={setStatus}/>
  <Form style={{ margin: '1em 0' }}>
      <div className="form-group">
          <input type="file" name="nftObject" onChange={onChangeNftObject}/>
      </div>      
      <Form.Field style={{ textAlign: 'center' }}>
        <TxButton
          accountPair={accountPair} label='Create Kitty' type='SIGNED-TX' setStatus={setStatus}
          attrs={{
            palletRpc: 'substrateKitties',
            callable: 'createKitty',
            inputParams: [nftObjectBase64Str],
            paramFields: [true]
          }}
        />
      </Form.Field>
    </Form>
    <div style={{ overflowWrap: 'break-word' }}>{status}</div>
  </Grid.Column>;
}
