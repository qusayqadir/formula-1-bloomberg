- [ ] **chatbot**
  - [x] server-side events to show agent thinking to user
  - [x] Add multi-turn chatbot conversation support
  - [ ] build evals for regulation docs 
    - [ ] decide on a threshold accuracy and lifecycle add FIA regs for prev seasons 
  - [ ] imporve agent response latency ( imporve ux while waiting for response ? ) 
  - [ ] take generated sql data and build image to server via data vis graph
  - [ ] add keyword search to acoomplish hybrid search 
  - [ ] store chat sessions (very low priority) 

- [ ] **historical dashboard** 
  - [x] Ingest qualifying results
  - [ ] head to head quali results widget 
  - [ ] ~~Ingest sprint qualifying results ( no data )~~ 
  - [x] Ingest sprint results
  - [ ] ++ingest pitstop data++
  - [ ] ++ingest lap data++ 
    - [ ] ++race recap just for 2025 season++ 
  - [ ] ingest race control data - openf1 
  - [ ] ingest driver cost data ( for each crash how much they were liable for? )  find api for this data 
  - [ ] driver career stats? WC, Wins, Poles? 
  - [ ] fix design for historical data to enable automatoin 
  - [ ] incremental poller, checkpointing, logging, reconciliation if upstream data corrects itself later

Work on team profiles

- [ ] **live dashboard** 
  - [ ] respond to openf1 to gain access and confirm api access keys
  - [ ] config kineses, and lamda pollers and publisher 
- [ ] **nice to have features** 
  - [ ] kalshi and polymarket and fanduel betting odds ( live or historical or both ? ) 

- [ ] **cloud config**
  - [ ] ++s3 static files++
    - [ ] ++team profile images + metadata?++ 
    - [ ] ++track/circuit images++ 
  - [x] Move regulation docs onto AWS-managed Mongodb
  - [ ] config elastic ip for ec2 instance and add it to accepted network ips for atlas