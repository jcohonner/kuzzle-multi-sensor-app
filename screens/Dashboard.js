import React, { Component } from 'react'
import { View, Text, FlatList, Dimensions, StyleSheet, Switch, Vibration, Button, TouchableOpacity, Alert } from 'react-native'
import { TriangleColorPicker, fromHsv } from 'react-native-color-picker'
import { Ionicons } from '@expo/vector-icons';
import { styles, lightblue, orange, green } from '../styles/styles'
import { store } from '../App'
import Kuzzle from 'kuzzle-sdk/dist/kuzzle.js'
Kuzzle.prototype.bluebird = require('bluebird')


// screen sizing
const { width, height } = Dimensions.get('window')
// orientation must fixed
const SCREEN_WIDTH = width < height ? width : height;
// const SCREEN_HEIGHT = width < height ? height : width;
const isSmallDevice = SCREEN_WIDTH <= 414;
const numColumns = isSmallDevice ? 2 : 3;
// item size
const PRODUCT_ITEM_HEIGHT = 255;
const PRODUCT_ITEM_OFFSET = 5;
const PRODUCT_ITEM_MARGIN = PRODUCT_ITEM_OFFSET * 2;

const KUZZLE_CONN_STATE = {
  DISCONNECTED: 0,
  CONNECTING: 1,
  ERROR: 2,
  CONNECTED: 3,
}

export default class Dashboard extends Component {
  constructor(props) {
    super(props)
    this.state = {
      kuzzle_conn: KUZZLE_CONN_STATE.DISCONNECTED,
      btn_state: {},
      my_devices: [],
      rfid_tags: [],
      rgb_light: {},
      light_level: undefined
    }
    this.deviceKey = 0
    this.kuzzleSettings = store.getState().kuzzleSettings
  }

  componentDidMount() {
    console.log('Dashboard: componentDidMount...')
    this.unsubscribeStore = store.subscribe(this.onStoreUpdated)
    this.kuzzle_connect(this.kuzzleSettings)
  }

  kuzzle_connect(k) {
    this.setState({ kuzzle_conn: KUZZLE_CONN_STATE.CONNECTING })
    this.kuzzle = Kuzzle(k.hostname, { defaultIndex: 'iot', port: k.port,  }, (err) => {
      if (err) {
        console.log('Kuzzle connection error:', err.toString())
        this.setState({kuzzle_conn: KUZZLE_CONN_STATE.ERROR})
        Alert.alert('Kuzzle connection error', err.toString(), [
          {text: 'Cancel', onPress: () => console.log('Cancel Pressed'), style: 'cancel'},
          {text: 'Retry', onPress: () => console.log('Retry Pressed')},
        ],
        { cancelable: false })
      } else {
        console.log('Connected to Kuzzle')
        this.setState({ kuzzle_conn: KUZZLE_CONN_STATE.CONNECTED })
        this.kuzzle.setDefaultIndex('iot')
        this.device_state_col = this.kuzzle.collection('device-state')
        this.searchUserDevice(store.getState().kuzzleSettings.user)
      }
    })
  }

  onStoreUpdated = () => {
    var k = store.getState().kuzzleSettings
    if (k.hostname !== this.kuzzleSettings.hostname ||
      k.port !== this.kuzzleSettings.port ||
      k.user !== this.kuzzleSettings.user ||
      k.password !== this.kuzzleSettings.password) {
      console.log("kuzzleSettings changed, reconnecting...")
      this.kuzzleSettings = k
      this.kuzzle.disconnect()
      this.setState({ kuzzle_conn: KUZZLE_CONN_STATE.DISCONNECTED })
      this.setState({ my_devices: [] })
      this.kuzzle_connect(k)

    }
  }

  componentWillUnmount() {
    console.log('Dashboard: componentWillUnmount...')
    this.unsubscribeStore()
    this.kuzzle.disconnect()
  }

  static navigationOptions = ({ navigation }) => {
    let headerRight = (
      <TouchableOpacity style={{ padding: 10 }} onPress={() => { navigation.navigate('Settings') }}>
        <Ionicons name="md-settings" size={28} color={'rgb(14,122,254)'} />
      </TouchableOpacity>
    )
    return { headerRight };
  }

  searchUserDevice(user) {
    console.log('Searching for "', user, '" devices...')
    var device_info_col = this.kuzzle.collection('device-info')
    device_info_col.search({
      query: {
        bool: {
          must: [
            {
              term: { owner: user }
            }
          ]
        }
      }
    }, { size: 100 }, (err, res) => {
      if (err) {
        console.log(err)
      }
      else {
        res.getDocuments().forEach(e => {
          var d = e.content
          switch (d.device_type) {
            case 'button':
              this.addDevice('Buttons', d.device_id)
              this.subscribe_to_buttons(d.device_id)
              break
            case 'RFID_reader':
              this.addDevice('RFID Cards', d.device_id)
              this.subscribe_to_rfid(d.device_id)
              break
            case 'motion-sensor':
              this.addDevice('Motion sensor', d.device_id)
              this.subscribe_to_motion_sensor(d.device_id)
              break
            case 'light_sensor':
              this.addDevice('Light level', d.device_id)
              this.subscribe_to_light_level_sensor(d.device_id)
              break
            case 'neopixel-linear':
              this.addDevice('LED Strip', d.device_id)
              this.subscribe_to_rgb_light(d.device_id)
              break
            default:
              console.log('Unhandled device type: ', d.device_type)
              break
          }

        })
      }
    })
  }

  addDevice(title, device_id) {
    console.log('addDevice: ')
    this.deviceKey++
    this.setState((prevState) => { return { my_devices: [...prevState.my_devices, { key: this.deviceKey, title, device_id }] } })
    console.log('my_devices: ', this.state.my_devices)
  }

  rgb_light_switch(on, device_id) {
    this.rgb_light_publish_state({ on }, device_id)
  }

  rgb_light_set_color(color, device_id) {
    this.rgb_light_publish_state({
      mode: "single-color",
      color,
      on: true
    }, device_id)
  }

  rgb_light_publish_state(state, device_id) {
    var device_state = {
      partial_state: true,
      device_id,
      device_type:'neopixel-linear',
      state
    }
    console.log('RGB light partial state : ', device_state)

    this.kuzzle.collection('device-state')
      .createDocument(device_state, (err, res) => {
        if (err)
          console.log(err)
        else
          console.log('Document published')

        console.log(res);
      })
  }

  get_button_style(btn_num) {
    return [
      dashboard_styles.button,
      dashboard_styles.button_released,
      this.state.btn_state && this.state.btn_state['button_' + btn_num] === 'PRESSED' && dashboard_styles.button_pressed
    ]
  }

  get_motion_style() {
    return [
      dashboard_styles.button,
      dashboard_styles.button_released,
      this.state.motion_state && this.state.motion_state.motion && dashboard_styles.button_pressed,

    ]
  }

  render_buttons(item) {
    return (
      <View style={[styles.framed, dashboard_styles.device]}>
        <Text style={[styles.card_header, dashboard_styles.headers]}>{item.title}</Text>
        <View style={this.get_button_style(0)}>
          <Text style={dashboard_styles.button_text}>Btn 0</Text>
        </View>
        <View style={this.get_button_style(1)}>
          <Text style={dashboard_styles.button_text}>Btn 1</Text>
        </View>
        <View style={this.get_button_style(2)}>
          <Text style={dashboard_styles.button_text}>Btn 2</Text>
        </View>
        <View style={this.get_button_style(3)}>
          <Text style={dashboard_styles.button_text}>Btn 3</Text>
        </View>
      </View>

    )
  }

  render_motion(item) {
    return (
      <View style={[styles.framed, dashboard_styles.device]}>
        <Text style={[styles.card_header, dashboard_styles.headers]}>{item.title}</Text>
        <View style={this.get_motion_style()}><Text style={
          {
            fontSize: 20,
            fontWeight: 'bold', paddingHorizontal: 20
          }}>Motion</Text></View>
      </View>
    )
  }

  get_rfid_style(item) {
    return [
      dashboard_styles.button,
      dashboard_styles.button_released,
      item.in_field && dashboard_styles.button_pressed
    ]
  }
  // RFID document fields:
  // card_id:"9549B990"
  // in_field:true

  nfc_key_extractor(item, index) {
    return item.card_id
  }

  render_nfc_item(item) {
    return (
      <View style={this.get_rfid_style(item.item)}><Text>{item.item.card_id}</Text></View>
    )
  }

  render_nfc(item) {
    return (
      <View style={[styles.framed, dashboard_styles.device]}>
        <Text style={[styles.card_header, dashboard_styles.headers]}>{item.title}</Text>
        <FlatList
          data={Object.keys(this.state.rfid_tags).map((k) => { return this.state.rfid_tags[k] })}
          extraData={this.state}
          renderItem={(item) => { return this.render_nfc_item(item) }}
          keyExtractor={this.nfc_key_extractor}
        />
      </View>
    )
  }

  render_light_level(item) {
    return (
      <View style={[styles.framed, dashboard_styles.device]}>
        <Text style={[styles.card_header, dashboard_styles.headers]}>{item.title}</Text>
        <Text
          style={dashboard_styles.light_level}>
          {this.state.light_level &&  this.state.light_level.level ? parseInt(this.state.light_level.level) + ' Lux' : ''}
        </Text>
      </View>
    )
  }

  render_rgb_light(item) {
    var rgb_light = this.state.rgb_light
    return (
      <View style={
        [
          styles.framed, dashboard_styles.device,
          // { height: 300 }
        ]}>
        <View style={{ flex: 1, flexDirection: 'column' }}>
          <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={[styles.card_header, dashboard_styles.headers]}>{item.title}</Text>
            <Switch value={this.state.rgb_light.on}
              onValueChange={(value) => this.rgb_light_switch(value, item.device_id)} />
          </View>
          <TriangleColorPicker style={{ flex: 1, width: 150 }}
            onColorChange={color => this.rgb_light_set_color(fromHsv(color), item.device_id)} />
        </View>
      </View>
    )
  }

  render() {
    switch (this.state.kuzzle_conn) {
      case KUZZLE_CONN_STATE.CONNECTED:
        return (
          <View style={styles.container}>
            <FlatList
              numColumns={2}
              data={this.state.my_devices}
              extraData={this.state}
              renderItem={
                ({ item }) => {
                  if (item.device_id.startsWith('buttons_'))
                    return this.render_buttons(item)
                  else if (item.device_id.startsWith('motion_'))
                    return this.render_motion(item)
                  else if (item.device_id.startsWith('rgb_light_'))
                    return this.render_rgb_light(item)
                  else if (item.device_id.startsWith('light_lvl_'))
                    return this.render_light_level(item)
                  else if (item.device_id.startsWith('NFC_'))
                    return this.render_nfc(item)
                }
              }
            />
          </View>
        )
      case KUZZLE_CONN_STATE.CONNECTING:
        return (
          <View style={styles.container}>
            <View style={styles.framed}>
              {/* <View style={[dashboard_styles.button, dashboard_styles.button_pressed]}> */}
              <Text style={dashboard_styles.info}>Connecting to Kuzzle...</Text>
              {/* </View> */}
            </View>
          </View>
        )
      case KUZZLE_CONN_STATE.DISCONNECTED:
      case KUZZLE_CONN_STATE.ERROR:
        return (
          <View style={styles.container}>
            <View style={styles.framed}>
              {/* <View style={[dashboard_styles.button, dashboard_styles.button_pressed]}> */}
              <Text style={dashboard_styles.info}>Disconnected from Kuzzle...</Text>
              {/* </View> */}
            </View>
          </View>
        )
    }
  }

  subscribe_to_buttons(device_id) {
    console.log('Subscribing to button events')
    this.device_state_col
      .subscribe({
        equals: {
          device_id
        }
      }, {
        subscribeToSelf: false
      }, (err, res) => {
        var state = res.document.content.state
        this.setState({ btn_state: state })
      })
      .onDone(() => {
        console.log('[DONE] Subscribing to button events')
      })
  }

  subscribe_to_motion_sensor(device_id) {
    console.log('Subscribing to motion sensor events')
    this.device_state_col
      .subscribe({
        equals: {
          device_id
        }
      }, {
        subscribeToSelf: false
      }, (err, res) => {
        var state = res.document.content.state
        this.setState({ motion_state: state })
      })
      .onDone(() => {
        console.log('[DONE] Subscribing to motion sensor events')
      })
  }

  subscribe_to_light_level_sensor(device_id) {
    console.log('Subscribing to light level sensor events')
    this.device_state_col
      .subscribe({
        equals: {
          device_id
        }
      }, {
        subscribeToSelf: false
      }, (err, res) => {
        var state = res.document.content.state
        this.setState({ light_level: state })
      })
      .onDone(() => {
        console.log('[DONE] Subscribing to light level sensor events')
      })
  }

  subscribe_to_rfid(device_id) {
    console.log('Subscribing to RFID card events')
    this.device_state_col
      .subscribe({
        equals: {
          device_id
        }
      }, {
        subscribeToSelf: false
      }, (err, res) => {
        var state = res.document.content.state
        this.setState((prevState) => {
          var n = Object()
          state.key=state.card_id
          return { rfid_tags: [state] }
        }, () => {
        })
      })
      .onDone(() => {
        console.log('[DONE] Subscribing to RFID card events');
      })
  }

  subscribe_to_rgb_light(device_id) {
    console.log('Subscribing to RGB light events')
    this.device_state_col
      .subscribe({
        and: [
          {
            equals: {
              device_id
            }
          }
        ]
      }, {
        subscribeToSelf: false
      }, (err, res) => {
        var state = res.document.content.state
        console.log(state);
        this.setState({ rgb_light: state }, () => {
        })
      })
      .onDone(() => {
        console.log('[DONE] Subscribing to RFID card events');
      })
  }

}
const dashboard_styles = StyleSheet.create({
  headers: {
    fontFamily: 'Verdana',
    fontWeight: 'bold',
    marginBottom: 15,
    fontSize: 16,
    textAlign: 'left',
    alignSelf: 'stretch',
  },
  device: {
    padding: 10,
    margin: 4,
    width: 185,
    alignSelf: 'center',
    alignItems: 'center',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  button: {
    padding: 5,
    justifyContent: 'center',
    margin: 4,
    // width: 100,
    borderRadius: 5,
    borderWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  button_released: {
    backgroundColor: '#433',
  },
  button_pressed: {
    backgroundColor: orange,
  },
  light_level: {
    fontSize: 30,
    fontWeight: 'bold',
    color: lightblue
  },
  info: {
    fontSize: 25,
    color: lightblue

  },
  button_text: {
    fontSize: 15,
    fontWeight: 'bold',
    paddingHorizontal: 20
  }
})
